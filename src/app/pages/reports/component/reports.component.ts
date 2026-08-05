import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { utils, writeFile, WorkBook } from 'xlsx';
import { ReportsService } from '../service/reports.service';
import { EmployeesService } from '../../employees/service/employees.service';
import { AuthService } from '../../../auth/Services/auth.service';

import { AnalyticsStats } from '../model/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  analyticsDate = '';
  analyticsDateDisplay = '';

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  rawData: any = null;
  analyticsRows: any[] = [];

  analyticsStats: AnalyticsStats = {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    earlyDeparture: 0,
    personalLeave: 0,
    workLeave: 0,
    mission: 0,
    drivingRoute: 0,
    needsReview: 0,
    reviewed: 0
  };

  departmentRows: any[] = [];
  selectedLocationId: number | null = null;
  locationOptions: Array<{ id: number; name: string }> = [];

  constructor(
    private reportsService: ReportsService,
    private employeesService: EmployeesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setTodayDate();
    this.loadLocations();
    this.loadAnalytics();
  }

  setTodayDate(): void {
    const today = new Date();

    this.analyticsDate = this.dateToApi(today);
    this.analyticsDateDisplay = this.dateToDisplay(today);
  }
  
  private extractAttendanceRows(data: any): any[] {
  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.records)) {
    return data.records;
  }

  if (Array.isArray(data?.details)) {
    return data.details;
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

  setYesterdayDate(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    this.analyticsDate = this.dateToApi(yesterday);
    this.analyticsDateDisplay = this.dateToDisplay(yesterday);
  }
  

  formatAnalyticsDateWhileTyping(): void {
    let value = String(this.analyticsDateDisplay || '')
      .replace(/\D/g, '')
      .slice(0, 8);

    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    this.analyticsDateDisplay = value;
  }

  openAnalyticsDatePicker(input: HTMLInputElement): void {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.click();
  }

  onAnalyticsNativeDatePicked(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const pickedValue = target?.value;

    if (!pickedValue) {
      return;
    }

    this.analyticsDate = pickedValue;
    this.analyticsDateDisplay = this.apiDateToDisplay(pickedValue);
  }

  onLocationChange(locationId: number | null): void {
    this.selectedLocationId = locationId;
  }

  private loadLocations(): void {
    this.employeesService.getLocations().subscribe({
      next: (response: any) => {
        this.locationOptions = response?.data || response || [];
      },
      error: (err) => {
        console.error('Failed to load location options:', err);
        this.locationOptions = [];
      }
    });
  }

  loadAnalytics(): void {
  if (!this.authService.isLoggedIn()) {
    this.errorMessage = 'لم يتم تسجيل الدخول بعد. يرجى تسجيل الدخول مرة أخرى ثم أعد المحاولة.';
    this.rawData = null;
    this.analyticsRows = [];
    this.departmentRows = [];
    this.resetStats();
    return;
  }

  const apiDate = this.displayDateToApi(this.analyticsDateDisplay);

  if (!apiDate) {
    this.errorMessage = 'من فضلك اكتب التاريخ بطريقة صحيحة مثل: 31/03/2026';
    return;
  }

  this.analyticsDate = apiDate;
  this.analyticsDateDisplay = this.apiDateToDisplay(apiDate);

  this.isLoading = true;
  this.errorMessage = '';
  this.successMessage = '';

  forkJoin({
    attendance: this.reportsService.getAttendanceByDateRange(
      this.analyticsDate,
      this.analyticsDate,
      null,
      '',
      1,
      10000
    ),
    // send API date in DD-MM-YYYY for Attendance/summary
    summary: this.reportsService.getAttendanceSummary(this.analyticsDate, this.selectedLocationId)
  }).subscribe({
    next: (result: any) => {
      console.log('Employees Summary Response:', result.summary);
      console.log('Attendance Date Range Response:', result.attendance);

      const summaryData = result.summary?.data || result.summary;
      const attendanceData = result.attendance?.data || result.attendance;

      const attendanceRows = this.extractAttendanceRows(attendanceData);

      this.rawData = summaryData;
      this.analyticsRows = attendanceRows.length
        ? attendanceRows
        : this.extractRows(summaryData);

      this.analyticsStats = this.buildStats(summaryData, this.analyticsRows);
      this.departmentRows = this.buildDepartmentRows(this.analyticsRows);

      this.successMessage = 'تم تحميل تحليل البيانات بنجاح';
      this.isLoading = false;
    },
    error: (err) => {
      console.log('Reports analytics error:', err);

      this.rawData = null;
      this.analyticsRows = [];
      this.departmentRows = [];
      this.resetStats();

      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('jwt');

      this.errorMessage =
        (err?.status === 401 || err?.status === 403)
          ? token
            ? 'فشل التحقق من الصلاحية. يرجى تسجيل الدخول مرة أخرى.'
            : 'لم يتم تسجيل الدخول بعد. يرجى تسجيل الدخول مرة أخرى ثم أعد المحاولة.'
          : err?.error?.message ||
            err?.message ||
            'حدث خطأ أثناء تحميل تحليل البيانات';

      this.isLoading = false;
    }
  });
}

  clearAnalytics(): void {
    this.analyticsDate = '';
    this.analyticsDateDisplay = '';
    this.rawData = null;
    this.analyticsRows = [];
    this.departmentRows = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.resetStats();
  }

  get regularPresentCount(): number {
  const total = Number(this.analyticsStats.total || 0);
  const absent = Number(this.analyticsStats.absent || 0);
  const late = Number(this.analyticsStats.late || 0);
  const earlyDeparture = Number(this.analyticsStats.earlyDeparture || 0);

  return Math.max(total - absent - late - earlyDeparture, 0);
}

get attendedCount(): number {
  const total = Number(this.analyticsStats.total || 0);
  const absent = Number(this.analyticsStats.absent || 0);

  return Math.max(total - absent, 0);
}

get attendancePercent(): number {
  if (!this.analyticsStats.total) {
    return 0;
  }

  return Math.round((this.attendedCount / this.analyticsStats.total) * 100);
}

get latePercent(): number {
  if (!this.analyticsStats.total) {
    return 0;
  }

  return Math.round((this.analyticsStats.late / this.analyticsStats.total) * 100);
}

get absencePercent(): number {
  if (!this.analyticsStats.total) {
    return 0;
  }

  return Math.round((this.analyticsStats.absent / this.analyticsStats.total) * 100);
}

  private extractRows(data: any): any[] {
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.employees)) return data.employees;
    if (Array.isArray(data?.details)) return data.details;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data)) return data;

    return [];
  }

private buildStats(data: any, rows: any[]): AnalyticsStats {
  const calculatedStats: AnalyticsStats = {
    total: rows.length,
    present: 0,
    absent: 0,
    late: 0,
    earlyDeparture: 0,
    personalLeave: 0,
    workLeave: 0,
    mission: 0,
    drivingRoute: 0,
    needsReview: 0,
    reviewed: 0
  };

  rows.forEach((row: any) => {
    const status = String(
      row.status ||
      row.attendanceStatus ||
      row.todayStatus ||
      ''
    ).trim();

    const notes = String(row.notes || '').toLowerCase();

    if (status === 'Present') {
      calculatedStats.present++;
    } else if (status === 'Absent') {
      calculatedStats.absent++;
    } else if (status === 'Late') {
      calculatedStats.late++;
    } else if (status === 'EarlyDeparture') {
      calculatedStats.earlyDeparture++;
    }

    const reviewed =
      row.isReviewed === true ||
      row.reviewed === true ||
      notes.includes('reviewed') ||
      notes.includes('تمت المراجعة') ||
      notes.includes('تمت مراجعه');

    const needsReview =
      !reviewed &&
      (
        row.needsReview === true ||
        row.needReview === true ||
        row.requiresReview === true ||
        notes.includes('needs review') ||
        notes.includes('يحتاج مراجعة') ||
        notes.includes('يحتاج مراجعه') ||
        notes.includes('حضور بدون انصراف') ||
        notes.includes('انصراف بدون حضور') ||
        notes.includes('checkin without checkout') ||
        notes.includes('checkout without checkin') ||
        status === 'Incomplete' ||
        status === 'MissingIn' ||
        status === 'MissingOut'
      );

    if (needsReview) {
      calculatedStats.needsReview++;
    }

    if (reviewed) {
      calculatedStats.reviewed++;
    }
  });

  return {
    total:
      this.pickNumber(data, ['total', 'totalEmployees', 'employeeCount', 'count']) ||
      calculatedStats.total,

    present:
      this.pickNumber(data, ['present', 'presentCount', 'totalPresent']) ||
      calculatedStats.present,

    absent:
      this.pickNumber(data, ['absent', 'absentCount', 'totalAbsent']) ||
      calculatedStats.absent,

    late:
      this.pickNumber(data, ['late', 'lateCount', 'totalLate']) ||
      calculatedStats.late,

    earlyDeparture:
      this.pickNumber(data, [
        'earlyDeparture',
        'earlyDepartureCount',
        'totalEarlyDeparture'
      ]) || calculatedStats.earlyDeparture,

    personalLeave:
      this.pickNumber(data, [
        'personalLeave',
        'personalLeaveCount',
        'totalPersonalLeave'
      ]) || 0,

    workLeave:
      this.pickNumber(data, [
        'workLeave',
        'workLeaveCount',
        'totalWorkLeave'
      ]) || 0,

    mission:
      this.pickNumber(data, [
        'mission',
        'missionCount',
        'totalMission'
      ]) || 0,

    drivingRoute:
      this.pickNumber(data, [
        'drivingRoute',
        'drivingRouteCount',
        'totalDrivingRoute'
      ]) || 0,

    needsReview:
      this.pickNumber(data, [
        'needsReview',
        'needReview',
        'needsReviewCount',
        'needReviewCount',
        'pendingReview',
        'pendingReviewCount',
        'reviewRequired',
        'reviewRequiredCount'
      ]) || calculatedStats.needsReview,

    reviewed:
      this.pickNumber(data, [
        'reviewed',
        'reviewedCount',
        'totalReviewed'
      ]) || calculatedStats.reviewed
  };
}
  private buildDepartmentRows(rows: any[]): any[] {
    const map = new Map<string, any>();

    rows.forEach((row: any) => {
      const departmentName =
        row.departmentName ||
        row.employee?.departmentName ||
        row.department?.name ||
        'غير محدد';

      const status = String(
        row.status || row.attendanceStatus || row.todayStatus || ''
      ).trim();

      if (!map.has(departmentName)) {
        map.set(departmentName, {
          departmentName,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          earlyDeparture: 0
        });
      }

      const item = map.get(departmentName);

      item.total++;

      if (status === 'Present') {
        item.present++;
      } else if (status === 'Absent') {
        item.absent++;
      } else if (status === 'Late') {
        item.late++;
      } else if (status === 'EarlyDeparture') {
        item.earlyDeparture++;
      }
    });

    return Array.from(map.values());
  }

  private pickNumber(data: any, keys: string[]): number {
    for (const key of keys) {
      const value = Number(data?.[key]);

      if (Number.isFinite(value)) {
        return value;
      }
    }

    return 0;
  }

  exportSummaryToExcel(): void {
    if (!this.rawData) {
      this.errorMessage = 'لا توجد بيانات للتصدير';
      return;
    }

    const exportData = [
      {
        التاريخ: this.rawData?.date || this.analyticsDateDisplay || '',
        'إجمالي الموظفين': this.pickNumber(this.rawData, ['total', 'totalEmployees', 'employeeCount', 'count']),
        حاضر: this.pickNumber(this.rawData, ['present', 'presentCount', 'totalPresent']),
        متأخر: this.pickNumber(this.rawData, ['late', 'lateCount', 'totalLate']),
        غائب: this.pickNumber(this.rawData, ['absent', 'absentCount', 'totalAbsent']),
        'ترك عمل': this.pickNumber(this.rawData, ['earlyDeparture', 'earlyDepartureCount', 'totalEarlyDeparture']),
        'إجازة شخصية': this.pickNumber(this.rawData, ['personalLeave', 'personalLeaveCount', 'totalPersonalLeave']),
        'إجازة عمل': this.pickNumber(this.rawData, ['workLeave', 'workLeaveCount', 'totalWorkLeave']),
        مأمورية: this.pickNumber(this.rawData, ['mission', 'missionCount', 'totalMission']),
        'رحلة قيادة': this.pickNumber(this.rawData, ['drivingRoute', 'drivingRouteCount', 'totalDrivingRoute'])
      }
    ];

    const worksheet = utils.json_to_sheet(exportData);
    const workbook: WorkBook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'ملخص اليوم');
    writeFile(workbook, `summary-${this.analyticsDateDisplay || 'report'}.xlsx`);
  }

  exportDepartmentToExcel(): void {
    if (!this.departmentRows || this.departmentRows.length === 0) {
      this.errorMessage = 'لا توجد بيانات أقسام للتصدير';
      return;
    }

    const exportData = this.departmentRows.map((row: any) => ({
      القسم: row.departmentName,
      الإجمالي: row.total,
      حاضر: row.present,
      غائب: row.absent,
      متأخر: row.late,
      'ترك عمل': row.earlyDeparture
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook: WorkBook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'تحليل الأقسام');
    writeFile(workbook, `departments-${this.analyticsDateDisplay || 'report'}.xlsx`);
  }

  private resetStats(): void {
    this.analyticsStats = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      earlyDeparture: 0,
      personalLeave: 0,
      workLeave: 0,
      mission: 0,
      drivingRoute: 0,
      needsReview: 0,
      reviewed: 0
    };
  }

  private dateToApi(date: Date): string {
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());

    return `${year}-${month}-${day}`;
  }

  private dateToDisplay(date: Date): string {
    const day = this.pad(date.getDate());
    const month = this.pad(date.getMonth() + 1);
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  private displayDateToApi(displayDate: string): string {
    const text = String(displayDate || '').trim();

    if (!text) return '';

    const normalizedText = text.replace(/[.\-]/g, '/');

    let day = 0;
    let month = 0;
    let year = 0;

    const slashMatch = normalizedText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (slashMatch) {
      day = Number(slashMatch[1]);
      month = Number(slashMatch[2]);
      year = Number(slashMatch[3]);
    } else {
      const digits = normalizedText.replace(/\D/g, '');

      if (!/^\d{8}$/.test(digits)) {
        return '';
      }

      day = Number(digits.slice(0, 2));
      month = Number(digits.slice(2, 4));
      year = Number(digits.slice(4, 8));
    }

    const date = new Date(year, month - 1, day);

    const isValidDate =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;

    if (!isValidDate) return '';

    return `${year}-${this.pad(month)}-${this.pad(day)}`;
  }

  private apiDateToDisplay(apiDate: string): string {
    if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) {
      return '';
    }

    const [year, month, day] = apiDate.split('-');

    return `${day}/${month}/${year}`;
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }
}