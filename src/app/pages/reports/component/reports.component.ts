import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/Services/auth.service';
import { getAttendanceStatusLabel } from '../../../shared/utils/attendance-status.util';
import { exportToExcel } from '../../../shared/utils/excel.util';
import { EmployeesService } from '../../employees/service/employees.service';
import { AnalyticsStats } from '../model/models';
import { ReportsService } from '../service/reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent implements OnInit {
  analyticsDate = '';
  analyticsDateDisplay = '';

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  analyticsStats: AnalyticsStats = this.emptyStats();

  selectedLocationId: number | null = null;
  locationOptions: Array<{ id: number; name: string }> = [];

  constructor(
    private reportsService: ReportsService,
    private employeesService: EmployeesService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.setTodayDate();
    this.loadLocations();
    if (!this.isSuperAdminUser) {
      this.loadAnalytics();
    }
  }

  get isSuperAdminUser(): boolean {
    return this.authService.getUserRole()?.trim() === 'SuperAdmin';
  }

  setTodayDate(): void {
    const today = new Date();
    this.analyticsDate = this.dateToApi(today);
    this.analyticsDateDisplay = this.dateToDisplay(today);
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
    if (!pickedValue) return;

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
      },
    });
  }

  loadAnalytics(): void {
    if (!this.authService.isLoggedIn()) {
      this.errorMessage = 'لم يتم تسجيل الدخول بعد. يرجى تسجيل الدخول مرة أخرى ثم أعد المحاولة.';
      this.resetStats();
      return;
    }

    if (this.isSuperAdminUser && this.selectedLocationId === null) {
      this.errorMessage = 'من فضلك اختر الموقع أولاً قبل تطبيق الفلترة';
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

    this.reportsService
      .getAttendanceSummary(this.analyticsDate, this.selectedLocationId ?? 0)
      .subscribe({
        next: (result: any) => {
          const summaryData = result?.data || result;

          this.analyticsStats = this.mapSummaryToStats(summaryData);
          this.buildSummaryRows();
          this.successMessage = 'تم تحميل تحليل البيانات بنجاح';
          this.isLoading = false;
        },
        error: (err) => {
          console.log('Reports analytics error:', err);

          this.resetStats();

          const token =
            localStorage.getItem('token') ||
            localStorage.getItem('accessToken') ||
            localStorage.getItem('jwt');

          this.errorMessage =
            err?.status === 401 || err?.status === 403
              ? token
                ? 'فشل التحقق من الصلاحية. يرجى تسجيل الدخول مرة أخرى.'
                : 'لم يتم تسجيل الدخول بعد. يرجى تسجيل الدخول مرة أخرى ثم أعد المحاولة.'
              : err?.error?.message || err?.message || 'حدث خطأ أثناء تحميل تحليل البيانات';

          this.isLoading = false;
        },
      });
  }

  statSummaryRows: Array<{ label: string; value: number; cssClass?: string }> = [];

  private buildSummaryRows(): void {
    const s = this.analyticsStats;

    this.statSummaryRows = [
      { label: 'إجمالي الموظفين', value: s.total, cssClass: 'val-total' },
      { label: getAttendanceStatusLabel('Present'), value: s.present, cssClass: 'val-present' },
      { label: getAttendanceStatusLabel('Absent'), value: s.absent, cssClass: 'val-absent' },
      { label: getAttendanceStatusLabel('Late'), value: s.late, cssClass: 'val-late' },
      {
        label: getAttendanceStatusLabel('EarlyDeparture'),
        value: s.earlyDeparture,
        cssClass: 'val-early',
      },
      {
        label: getAttendanceStatusLabel('PersonalLeave'),
        value: s.personalLeave,
        cssClass: 'val-default',
      },
      { label: getAttendanceStatusLabel('OnLeave'), value: s.onLeave, cssClass: 'val-default' },
      { label: getAttendanceStatusLabel('Mission'), value: s.mission, cssClass: 'val-default' },
      {
        label: getAttendanceStatusLabel('DrivingRoute'),
        value: s.drivingRoute,
        cssClass: 'val-default',
      },
      { label: getAttendanceStatusLabel('Online'), value: s.online, cssClass: 'val-default' },
      {
        label: getAttendanceStatusLabel('MissingCheckOut'),
        value: s.missingCheckOut,
        cssClass: 'val-default',
      },
      {
        label: getAttendanceStatusLabel('AbandonedWork'),
        value: s.abandonedWork,
        cssClass: 'val-default',
      },
      { label: getAttendanceStatusLabel('WeeklyOff'), value: s.weeklyOff, cssClass: 'val-default' },
    ];
  }

  clearAnalytics(): void {
    this.analyticsDate = '';
    this.analyticsDateDisplay = '';
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

  // ============================================================
  // mapSummaryToStats — بيقرأ مباشرة من GetAttendanceSummaryQuery.
  // مفيش إعادة حساب من أي rows، القيم كلها مصدرها الـ backend.
  // ============================================================
  private mapSummaryToStats(data: any): AnalyticsStats {
    return {
      total: this.pickNumber(data, ['totalEmployees']),
      present: this.pickNumber(data, ['present']),
      absent: this.pickNumber(data, ['absent']),
      late: this.pickNumber(data, ['late']),
      earlyDeparture: this.pickNumber(data, ['earlyDeparture']),
      personalLeave: this.pickNumber(data, ['personalLeave']),
      workLeave: this.pickNumber(data, ['workLeave']),
      mission: this.pickNumber(data, ['mission']),
      drivingRoute: this.pickNumber(data, ['drivingRoute']),
      onLeave: this.pickNumber(data, ['onLeave']),
      online: this.pickNumber(data, ['online']),
      missingCheckOut: this.pickNumber(data, ['missingCheckOut']),
      abandonedWork: this.pickNumber(data, ['abandonedWork']),
      weeklyOff: this.pickNumber(data, ['weeklyOff']),
    };
  }

  private pickNumber(data: any, keys: string[]): number {
    for (const key of keys) {
      const value = Number(data?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  exportSummaryToExcel(): void {
    const s = this.analyticsStats;

    const exportData = [
      { الإحصائية: 'إجمالي الموظفين', القيمة: s.total },
      { الإحصائية: getAttendanceStatusLabel('Present'), القيمة: s.present },
      { الإحصائية: getAttendanceStatusLabel('Absent'), القيمة: s.absent },
      { الإحصائية: getAttendanceStatusLabel('Late'), القيمة: s.late },
      { الإحصائية: getAttendanceStatusLabel('EarlyDeparture'), القيمة: s.earlyDeparture },
      { الإحصائية: getAttendanceStatusLabel('PersonalLeave'), القيمة: s.personalLeave },
      { الإحصائية: getAttendanceStatusLabel('OnLeave'), القيمة: s.onLeave },
      { الإحصائية: getAttendanceStatusLabel('Mission'), القيمة: s.mission },
      { الإحصائية: getAttendanceStatusLabel('DrivingRoute'), القيمة: s.drivingRoute },
      { الإحصائية: getAttendanceStatusLabel('Online'), القيمة: s.online },
      { الإحصائية: getAttendanceStatusLabel('MissingCheckOut'), القيمة: s.missingCheckOut },
      { الإحصائية: getAttendanceStatusLabel('AbandonedWork'), القيمة: s.abandonedWork },
      { الإحصائية: getAttendanceStatusLabel('WeeklyOff'), القيمة: s.weeklyOff },
    ];

    const fileName = `ملخص-اليوم-${this.analyticsDateDisplay ? this.analyticsDateDisplay.replace(/\//g, '-') : 'تقرير'}`;
    exportToExcel(exportData, fileName, 'ملخص اليوم');
  }

  private emptyStats(): AnalyticsStats {
    return {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      earlyDeparture: 0,
      personalLeave: 0,
      workLeave: 0,
      mission: 0,
      drivingRoute: 0,
      onLeave: 0,
      online: 0,
      missingCheckOut: 0,
      abandonedWork: 0,
      weeklyOff: 0,
    };
  }

  private resetStats(): void {
    this.analyticsStats = this.emptyStats();
    this.buildSummaryRows();
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
      if (!/^\d{8}$/.test(digits)) return '';

      day = Number(digits.slice(0, 2));
      month = Number(digits.slice(2, 4));
      year = Number(digits.slice(4, 8));
    }

    const date = new Date(year, month - 1, day);

    const isValidDate =
      date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

    if (!isValidDate) return '';

    return `${year}-${this.pad(month)}-${this.pad(day)}`;
  }

  private apiDateToDisplay(apiDate: string): string {
    if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) return '';
    const [year, month, day] = apiDate.split('-');
    return `${day}/${month}/${year}`;
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
