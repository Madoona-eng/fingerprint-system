import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { read, utils, WorkBook, WorkSheet } from 'xlsx';
import { AuthService } from '../../../auth/Services/auth.service';
import { getAttendanceStatusLabel } from '../../../shared/utils/attendance-status.util';
import { exportToExcel } from '../../../shared/utils/excel.util';
import { EmployeesService } from '../../employees/service/employees.service';
import { AttendancePayload, FingerprintPunch } from '../model/models';
import { AttendanceService } from '../service/attendance.service';
import { AttendanceImportComponent } from './import/attendance-import.component';
import { AttendanceReportComponent } from './report/attendance-report.component';
import { AttendanceLateSummaryComponent } from './late-summary/attendance-late-summary.component';
import { AttendanceEditComponent } from './edit/attendance-edit.component';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, AttendanceImportComponent, AttendanceReportComponent, AttendanceLateSummaryComponent, AttendanceEditComponent],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css'],
})
export class AttendanceComponent implements OnInit {
  // ============================================================
  // PROPERTIES / STATE
  // ============================================================
  attendanceRows: AttendancePayload[] = [];

  sheetPreviewRows: Array<{ [key: string]: any }> = [];
  sheetPreviewHeaders: string[] = [];

  excelFileName = '';
  successMessage = '';
  errorMessage = '';
  rowErrors: string[] = [];

  isImporting = false;
  hasImportedCurrentSheet = false;

  private readonly emptyAttendanceMarker: null = null;

  activeAttendancePage: 'import' | 'report' | 'lateSummary' | 'edit' = 'import';

  dateRangeRows: any[] = [];
  dateRangeFrom = '';
  dateRangeTo = '';
  dateRangeDepartmentId: number | null = null;
  dateRangeStatus = '';
  dateRangeNeedsReview: boolean | null = null;
  dateRangeRoute = '';
  routeOptions: string[] = [];
  reviewingAttendanceId: number | null = null;
  employeeSearchTerm = '';
  dateRangePageNumber = 1;
  dateRangePageSize = 10;
  dateRangeTotalCount = 0;
  dateRangeTotalPages = 0;
  dateRangeFromDisplay = '';
  dateRangeToDisplay = '';
  isLoadingDateRange = false;
  dateRangeErrorMessage = '';
  dateRangeSuccessMessage = '';

  selectedAttendanceForEdit: any = null;
  notesModalOpen = false;
  notesModalTitle = '';
  notesModalEntries: Array<{ content: string; displayName?: string; createdAt?: string }> = [];
  notesModalRow: any = null;

  attendanceEditId: number | null = null;
  attendanceEditEmployeeCode = '';
  attendanceEditEmployeeName = '';
  attendanceEditDepartmentName = '';
  attendanceEditDate = '';
  attendanceEditActualIn = '';
  attendanceEditActualOut = '';
  attendanceEditStatus = '';
  attendanceEditNotes = '';

  isSavingAttendanceEdit = false;
  attendanceEditErrorMessage = '';
  attendanceEditSuccessMessage = '';

  lateSummaryFrom = '';
  lateSummaryTo = '';
  lateSummaryEmployeeId: number | null = null;
  lateSummaryDepartmentId: number | null = null;
  lateSummaryFromDisplay = '';
  lateSummaryToDisplay = '';
  lateSummaryData: any = null;
  lateSummaryRows: any[] = [];
  lateSummaryEmployeeSearch = '';
  lateSummarySelectedEmployee: any = null;
  lateSummaryPageNumber = 1;
  lateSummaryPageSize = 10;
  lateSummaryTotalCount = 0;
  lateSummaryTotalPages = 0;
  isLoadingLateSummary = false;
  lateSummaryErrorMessage = '';
  lateSummarySuccessMessage = '';

  isSuperAdmin = false;
  locations: { id: number; name: string }[] = [];
  selectedLocationId: number | null = null;
  lateSummaryLocationId: number | null = null;

  private lateSummarySearchTimer: any = null;

  departmentOptions: { id: number; name: string }[] = [];

  private readonly statusApiValues: string[] = [
    'Present',
    'Late',
    'Absent',
    'EarlyDeparture',
    'PersonalLeave',
    'Mission',
    'DrivingRoute',
    'OnLeave',
    'Online'
  ];

  get statusOptions(): { value: string; label: string }[] {
    return this.statusApiValues.map((value) => ({
      value,
      label: this.getAttendanceStatusLabel(value),
    }));
  }

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private employeesService: EmployeesService,
  ) {}

  // ============================================================
  // ngOnInit
  // ============================================================
  ngOnInit(): void {
    this.checkUserRole();
    this.loadRouteOptions();
    this.initializeDepartments();
  }

  // ============================================================
  // checkUserRole
  // ============================================================
  checkUserRole(): void {
    const role = this.authService.getUserRole();
    this.isSuperAdmin = role === 'SuperAdmin';

    if (this.isSuperAdmin) {
      this.loadLocations();
    }
  }

  // ============================================================
  // loadLocations
  // ============================================================
  loadLocations(): void {
    this.employeesService.getLocations().subscribe({
      next: (response: any) => {
        this.locations = response?.data || [];
      },
      error: (err) => {
        console.error('Failed to load locations:', err);
      },
    });
  }

  // ============================================================
  // onLocationChange
  // ============================================================
  onLocationChange(locationId: number | null): void {
    this.selectedLocationId = locationId;
    this.dateRangeDepartmentId = null;

    if (locationId !== null) {
      this.employeesService.getDepartments(locationId).subscribe({
        next: (response: any) => {
          this.departmentOptions = response?.data || [];
        },
        error: (err) => {
          console.error('Failed to load departments for location:', err);
          this.departmentOptions = [];
        },
      });
    } else {
      this.departmentOptions = [];
    }
  }

  // ============================================================
  // initializeDepartments
  // ============================================================
  initializeDepartments(): void {
    if (this.isSuperAdmin) {
      this.departmentOptions = [];
      return;
    }

    this.employeesService.getDepartments().subscribe({
      next: (response: any) => {
        this.departmentOptions = response?.data || [];
      },
      error: (err) => {
        console.error('Failed to load initial departments:', err);
      },
    });
  }

  // ============================================================
  // loadRouteOptions
  // ============================================================
  loadRouteOptions(): void {
    this.attendanceService.getAttendanceRoutes().subscribe({
      next: (response: any) => {
        const data = response?.data || response;

        if (Array.isArray(data)) {
          this.routeOptions = data.map((item: any) => {
            if (typeof item === 'string') {
              return item;
            }

            return item?.name || item?.route || item?.value || String(item);
          });
        } else {
          this.routeOptions = [];
        }
      },
      error: (err) => {
        console.log('Failed to load route options:', err);
        this.routeOptions = [];
      },
    });
  }

  // ============================================================
  // setDateRangeFromDates (private)
  // ============================================================
  private setDateRangeFromDates(from: Date, to: Date): void {
    this.dateRangeFrom = this.formatDateToApi(from);
    this.dateRangeTo = this.formatDateToApi(to);

    this.dateRangeFromDisplay = this.formatDateToDisplay(from);
    this.dateRangeToDisplay = this.formatDateToDisplay(to);
  }

  // ============================================================
  // getApiErrorMessage (private)
  // ============================================================
  private getApiErrorMessage(err: any): string {
    const errors = err?.error?.errors;

    if (errors && typeof errors === 'object') {
      const messages = Object.keys(errors)
        .map((key) => `${key}: ${errors[key].join(' - ')}`)
        .join(' | ');

      return this.translateApiMessage(messages, 'حدث خطأ في التحقق من البيانات');
    }

    return this.translateApiMessage(
      err?.error?.message || err?.error?.title || err?.message || 'حدث خطأ أثناء الحفظ',
      'حدث خطأ أثناء الحفظ',
    );
  }

  // ============================================================
  // translateApiMessage (private)
  // ============================================================
  private translateApiMessage(message: string | null | undefined, fallback: string = ''): string {
    const raw = String(message || '').trim();

    if (!raw) {
      return fallback;
    }

    const replacements: Array<[string, string]> = [
      [
        'checkout completed from next day import - please verify',
        'تم إكمال الخروج من استيراد اليوم التالي - يرجى التحقق',
      ],
      ['checkout completed from next day import', 'تم إكمال الخروج من استيراد اليوم التالي'],
      ['please verify', 'يرجى التحقق'],
      ['verify', 'تحقق'],
      ['completed', 'اكتمل'],
      ['import', 'استيراد'],
      ['next day', 'اليوم التالي'],
      ['checkout', 'الخروج'],
      ['check out', 'الخروج'],
      ['checkin', 'الدخول'],
      ['check in', 'الدخول'],
      ['missing', 'مفقود'],
      ['review', 'مراجعة'],
      ['reviewed', 'تمت المراجعة'],
      ['success', 'نجاح'],
      ['failed', 'فشل'],
      ['error', 'خطأ'],
      ['warning', 'تحذير'],
      ['not found', 'غير موجود'],
      ['invalid', 'غير صالح'],
      ['required', 'مطلوب'],
      ['already', 'موجود بالفعل'],
      ['unable to', 'غير قادر على'],
      ['cannot', 'لا يمكن'],
      ['needs review', 'يحتاج مراجعة'],
      ['needs revision', 'يحتاج مراجعة'],
      ['needs', 'يحتاج'],
      ['without', 'بدون'],
      ['check in without check out', 'دخول بدون خروج'],
      ['check out without check in', 'خروج بدون دخول'],
      ['checkout without checkin', 'خروج بدون دخول'],
      ['checkin without checkout', 'دخول بدون خروج'],
    ];

    let translated = raw;

    replacements.forEach(([source, target]) => {
      translated = translated.replace(new RegExp(source, 'gi'), target);
    });

    return translated;
  }

  // ============================================================
  // onDateRangeInputChange
  // ============================================================
  onDateRangeInputChange(value: string, field: 'from' | 'to'): void {
    const displayValue = String(value || '').trim();

    // Convert the display string (e.g. 31/03/2026) to API date (YYYY-MM-DD)
    const apiDate = this.displayDateToApi(displayValue);

    if (field === 'from') {
      this.dateRangeFromDisplay = displayValue;
      this.dateRangeFrom = apiDate;
      return;
    }

    this.dateRangeToDisplay = displayValue;
    this.dateRangeTo = apiDate;
  }

  // ============================================================
  // openNativeDatePicker
  // ============================================================
  openNativeDatePicker(input: HTMLInputElement): void {
    if ((input as any).showPicker) {
      (input as any).showPicker();
      return;
    }

    input.click();
  }

  // ============================================================
  // onNativeDatePicked
  // ============================================================
  onNativeDatePicked(event: Event, field: 'from' | 'to'): void {
    const input = event.target as HTMLInputElement;
    const apiDate = input.value; // YYYY-MM-DD

    if (!apiDate) {
      return;
    }

    if (field === 'from') {
      this.dateRangeFrom = apiDate;
      this.dateRangeFromDisplay = this.apiDateToDisplay(apiDate);
    } else {
      this.dateRangeTo = apiDate;
      this.dateRangeToDisplay = this.apiDateToDisplay(apiDate);
    }
  }

  // ============================================================
  // onLateSummaryDateInputChange
  // ============================================================
  onLateSummaryDateInputChange(value: string, field: 'from' | 'to'): void {
    const displayValue = String(value || '').trim();
    const apiDate = this.displayDateToApi(displayValue);

    if (field === 'from') {
      this.lateSummaryFromDisplay = displayValue;
      this.lateSummaryFrom = apiDate;
    } else {
      this.lateSummaryToDisplay = displayValue;
      this.lateSummaryTo = apiDate;
    }
  }

  // ============================================================
  // formatDateDisplayWhileTyping (dateRange version)
  // ============================================================
  formatDateDisplayWhileTyping(field: 'from' | 'to'): void {
    let value = field === 'from' ? this.dateRangeFromDisplay : this.dateRangeToDisplay;

    value = String(value || '')
      .replace(/\D/g, '')
      .slice(0, 8);

    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    if (field === 'from') {
      this.dateRangeFromDisplay = value;
    } else {
      this.dateRangeToDisplay = value;
    }
  }

  // ============================================================
  // formatDateToApi (private) [dateRange helper]
  // ============================================================
  private formatDateToApi(date: Date): string {
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());

    return `${year}-${month}-${day}`;
  }

  // ============================================================
  // formatDateToDisplay (private) [dateRange helper]
  // ============================================================
  private formatDateToDisplay(date: Date): string {
    const day = this.pad(date.getDate());
    const month = this.pad(date.getMonth() + 1);
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  // ============================================================
  // onLateSummaryNativeDatePicked
  // ============================================================
  onLateSummaryNativeDatePicked(event: Event, field: 'from' | 'to'): void {
    const input = event.target as HTMLInputElement;
    const apiDate = input.value; // YYYY-MM-DD

    if (!apiDate) {
      return;
    }

    if (field === 'from') {
      this.lateSummaryFrom = apiDate;
      this.lateSummaryFromDisplay = this.apiDateToDisplay(apiDate);
    } else {
      this.lateSummaryTo = apiDate;
      this.lateSummaryToDisplay = this.apiDateToDisplay(apiDate);
    }
  }

  // ============================================================
  // displayDateToNative
  // ============================================================
  displayDateToNative(displayDate: string): string {
    return this.displayDateToApi(displayDate);
  }

  // ============================================================
  // apiDateToDisplay (private) [dateRange helper]
  // ============================================================
  private apiDateToDisplay(apiDate: string): string {
    if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) {
      return '';
    }

    const [year, month, day] = apiDate.split('-');

    return `${day}/${month}/${year}`;
  }

  // ============================================================
  // displayDateToApi (private) [dateRange helper]
  // ============================================================
  private displayDateToApi(displayDate: string): string {
    const text = String(displayDate || '').trim();

    if (!text) {
      return '';
    }

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
      date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

    if (!isValidDate) {
      return '';
    }

    return `${year}-${this.pad(month)}-${this.pad(day)}`;
  }

  // ============================================================
  // openAttendancePage
  // ============================================================
  openAttendancePage(page: 'import' | 'report' | 'lateSummary' | 'edit'): void {
    this.activeAttendancePage = page;

    if (page === 'lateSummary' && !this.lateSummaryFromDisplay && !this.lateSummaryToDisplay) {
      this.setTodayLateSummaryDateRange();
    }
  }

  // ============================================================
  // onAttendanceSheetSelected
  // ============================================================
  onAttendanceSheetSelected(file: File): void {
    this.readAttendanceFile(file);
  }

  // ============================================================
  // setTodayLateSummaryDateRange
  // ============================================================
  setTodayLateSummaryDateRange(): void {
    const today = new Date();
    this.setLateSummaryDateRangeFromDates(today, today);
  }

  // ============================================================
  // setYesterdayLateSummaryDateRange
  // ============================================================
  setYesterdayLateSummaryDateRange(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    this.setLateSummaryDateRangeFromDates(yesterday, yesterday);
  }

  // ============================================================
  // setCurrentMonthLateSummaryDateRange
  // ============================================================
  setCurrentMonthLateSummaryDateRange(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.setLateSummaryDateRangeFromDates(firstDay, today);
  }

  // ============================================================
  // setLateSummaryDateRangeFromDates (private)
  // ============================================================
  private setLateSummaryDateRangeFromDates(from: Date, to: Date): void {
    this.lateSummaryFrom = this.formatLateDateToApi(from);
    this.lateSummaryTo = this.formatLateDateToApi(to);

    this.lateSummaryFromDisplay = this.formatLateDateToDisplay(from);
    this.lateSummaryToDisplay = this.formatLateDateToDisplay(to);
  }

  // ============================================================
  // formatLateDateDisplayWhileTyping (lateSummary version)
  // ============================================================
  formatLateDateDisplayWhileTyping(field: 'from' | 'to'): void {
    let value = field === 'from' ? this.lateSummaryFromDisplay : this.lateSummaryToDisplay;

    value = String(value || '')
      .replace(/\D/g, '')
      .slice(0, 8);

    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    if (field === 'from') {
      this.lateSummaryFromDisplay = value;
    } else {
      this.lateSummaryToDisplay = value;
    }
  }

  // ============================================================
  // formatLateDateToApi (private) [lateSummary helper]
  // ============================================================
  private formatLateDateToApi(date: Date): string {
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());

    return `${year}-${month}-${day}`;
  }

  // ============================================================
  // formatLateDateToDisplay (private) [lateSummary helper]
  // ============================================================
  private formatLateDateToDisplay(date: Date): string {
    const day = this.pad(date.getDate());
    const month = this.pad(date.getMonth() + 1);
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  // ============================================================
  // lateDisplayDateToApi (private) [lateSummary helper - UNUSED? check callers]
  // ============================================================
  private lateDisplayDateToApi(displayDate: string): string {
    const text = String(displayDate || '').trim();

    if (!text) {
      return '';
    }

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
      date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

    if (!isValidDate) {
      return '';
    }

    return `${year}-${this.pad(month)}-${this.pad(day)}`;
  }

  // ============================================================
  // lateApiDateToDisplay (private) [lateSummary helper - UNUSED? check callers]
  // ============================================================
  private lateApiDateToDisplay(apiDate: string): string {
    if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) {
      return '';
    }

    const [year, month, day] = apiDate.split('-');

    return `${day}/${month}/${year}`;
  }

  // ============================================================
  // onDragOver
  // ============================================================
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  // ============================================================
  // setTodayDateRange
  // ============================================================
  setTodayDateRange(): void {
    const today = new Date();
    const formattedDate = this.formatDateForInput(today);

    this.dateRangeFrom = formattedDate;
    this.dateRangeTo = formattedDate;
  }

  // ============================================================
  // setYesterdayDateRange
  // ============================================================
  setYesterdayDateRange(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const formattedDate = this.formatDateForInput(yesterday);

    this.dateRangeFrom = formattedDate;
    this.dateRangeTo = formattedDate;
  }

  // ============================================================
  // setCurrentMonthDateRange
  // ============================================================
  setCurrentMonthDateRange(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.dateRangeFrom = this.formatDateForInput(firstDay);
    this.dateRangeTo = this.formatDateForInput(today);
  }

  // ============================================================
  // formatDateForInput (private) [THIRD near-duplicate date formatter]
  // ============================================================
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());

    return `${year}-${month}-${day}`;
  }

  // ============================================================
  // filteredDateRangeRows (getter) - SERVER-SIDE filtered rows only
  // ============================================================
  get filteredDateRangeRows(): any[] {
    return this.dateRangeRows;
  }

  // ============================================================
  // getAttendanceExportRow
  // ============================================================
  getAttendanceExportRow(row: any): any {
    return {
      الكود: row.employeeCode || row.employee?.employeeCode || row.employee?.code || '-',
      اسم_الموظف: row.employeeName || row.name || row.employee?.name || row.employee?.employeeName || '-',
      القسم: row.departmentName || row.employee?.departmentName || row.department?.name || '-',
      التاريخ: row.date || row.attendanceDate || '-',
      'معاد الحضور': row.scheduleIn || row.shift?.scheduleIn || row.shift?.inTime || row.schedule?.in || '-',
      'معاد الانصراف': row.scheduleOut || row.shift?.scheduleOut || row.shift?.outTime || row.schedule?.out || '-',
      الحضور: row.actualIn || '-',
      الانصراف: row.actualOut || '-',
      الحالة: this.getAttendanceStatusLabel(row.status),
      'التأخير (د)': row.lateMinutes ?? '-',
      'العمل (س)': this.formatWorkedHours(row.workedMinutes),
    };
  }

  // ============================================================
  // exportAttendanceReportToExcel  --- USES getAttendanceByDateRange (paginated fetch-all)
  // ============================================================
  exportAttendanceReportToExcel(): void {
    (async () => {
      if (!this.dateRangeFrom || !this.dateRangeTo) {
        this.dateRangeErrorMessage = 'من فضلك قم بإختيار تاريخ البداية والنهاية';
        return;
      }

      this.dateRangeErrorMessage = '';
      this.isLoadingDateRange = true;

      const perPage = 1000;
      let page = 1;
      let totalPages = 1;
      const allRows: any[] = [];

      try {
        while (page <= totalPages) {
          const resp: any = await firstValueFrom(
            this.attendanceService.getAttendanceByDateRange(
              this.dateRangeFrom,
              this.dateRangeTo,
              this.dateRangeDepartmentId,
              this.dateRangeStatus,
              page,
              perPage,
              this.dateRangeRoute,
              this.employeeSearchTerm || null,
              this.selectedLocationId,
              this.dateRangeNeedsReview,
            ),
          );

          const data = resp?.data || resp;
          let items: any[] = [];

          if (Array.isArray(data?.items)) {
            items = data.items;
            totalPages = data.totalPages || 1;
          } else if (Array.isArray(data)) {
            items = data;
            totalPages = 1;
          } else {
            items = [];
            totalPages = 0;
          }

          allRows.push(...this.prepareDateRangeRows(items));
          page++;
        }

        if (allRows.length === 0) {
          this.dateRangeErrorMessage = 'لا توجد بيانات للحضور للتصدير';
          this.isLoadingDateRange = false;
          return;
        }

        const exportData = allRows.map((row: any) => this.getAttendanceExportRow(row));

        exportToExcel(exportData, `تقرير-الحضور-${this.dateRangeFrom || 'تقرير'}`, 'تقرير الحضور');
      } catch (err) {
        console.error('Failed exporting attendance report', err);
        this.dateRangeErrorMessage = 'فشل تصدير ملف Excel';
      } finally {
        this.isLoadingDateRange = false;
      }
    })();
  }

  // ============================================================
  // exportLateSummaryToExcel  --- USES getLateSummary (paginated fetch-all)
  // ============================================================
  exportLateSummaryToExcel(): void {
    (async () => {
      if (!this.lateSummaryFrom || !this.lateSummaryTo) {
        this.lateSummaryErrorMessage = 'من فضلك حدد نطاق تاريخ لملخص التأخير';
        return;
      }

      this.lateSummaryErrorMessage = '';
      this.isLoadingLateSummary = true;

      const perPage = 1000;
      let page = 1;
      let totalPages = 1;
      const allRows: any[] = [];

      try {
        while (page <= totalPages) {
          const resp: any = await firstValueFrom(
            this.attendanceService.getLateSummary(
              this.lateSummaryFrom,
              this.lateSummaryTo,
              this.lateSummaryEmployeeSearch || null,
              this.lateSummaryDepartmentId || null,
              page,
              perPage,
              this.lateSummaryLocationId || null,
            ),
          );

          const data = resp?.data || resp;
          let items: any[] = [];

          if (Array.isArray(data?.items)) {
            items = data.items;
            totalPages = data.totalPages || 1;
          } else if (Array.isArray(data)) {
            items = data;
            totalPages = 1;
          } else {
            items = [];
            totalPages = 0;
          }

          allRows.push(...items);
          page++;
        }

        if (allRows.length === 0) {
          this.lateSummaryErrorMessage = 'لا توجد بيانات لملخص التأخير للتصدير';
          this.isLoadingLateSummary = false;
          return;
        }

        const exportData = allRows.map((row: any) => ({
          كود_الموظف: row.employeeCode || '-',
          اسم_الموظف: row.employeeName || '-',
          القسم: row.departmentName || '-',
          'من تاريخ': row.from || '-',
          'إلى تاريخ': row.to || '-',
          'إجمالي دقائق التأخير': row.totalLateMinutes || 0,
        }));

        exportToExcel(exportData, `ملخص-التأخير-${this.lateSummaryFrom || 'ملخص'}`, 'ملخص التأخير');
      } catch (err) {
        console.error('Failed exporting late summary', err);
        this.lateSummaryErrorMessage = 'فشل تصدير ملف Excel';
      } finally {
        this.isLoadingLateSummary = false;
      }
    })();
  }

  // ============================================================
  // getAttendanceId
  // ============================================================
  getAttendanceId(row: any): number | null {
    const id = row?.id || row?.attendanceId || row?.attendanceRecordId;

    if (!id) {
      return null;
    }

    const numberId = Number(id);

    return Number.isFinite(numberId) && numberId > 0 ? numberId : null;
  }

  // ============================================================
  // isReviewed
  // ============================================================
  isManuallyEdited(row: any): boolean {
    const value = row?.isManualOverride ?? row?.manualOverride;
    return value === true || value === 1 || value === 'true' || value === 'True';
  }

  isReviewed(row: any): boolean {
    const normalizedNotes = this.normalizeNotesValue(row?.notes).toLowerCase();

    const reviewFlag = [
      row?.isReviewed,
      row?.reviewed,
      row?.isReviewCompleted,
      row?.hasBeenReviewed,
    ].some((value) => value === true);

    return (
      this.isManuallyEdited(row) ||
      reviewFlag ||
      normalizedNotes.includes('تمت المراجعة') ||
      normalizedNotes.includes('تمت مراجعه') ||
      normalizedNotes.includes('reviewed')
    );
  }

  // ============================================================
  // formatWorkedHours
  // ============================================================
  formatWorkedHours(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const totalMinutes = Number(value);

    if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
      return '-';
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} دقيقة`;
    }

    if (minutes === 0) {
      return `${hours} ساعة`;
    }

    return `${hours} ساعة و ${minutes} دقيقة`;
  }

  // ============================================================
  // needsReview
  // ============================================================
  needsReview(row: any): boolean {
    if (this.isManuallyEdited(row) || this.isReviewed(row)) {
      return false;
    }

    const normalizedNotes = this.normalizeNotesValue(row?.notes).toLowerCase();
    const status = String(row?.status || '').trim();
    const explicitReviewFlag = [row?.needsReview, row?.requiresReview, row?.reviewRequired].some(
      (value) => value === true,
    );

    return (
      explicitReviewFlag ||
      normalizedNotes.includes('needs review') ||
      normalizedNotes.includes('يحتاج مراجعة') ||
      normalizedNotes.includes('يحتاج مراجعه') ||
      normalizedNotes.includes('checkin without checkout') ||
      normalizedNotes.includes('checkout without checkin') ||
      status === 'Incomplete' ||
      status === 'MissingIn' ||
      status === 'MissingOut'
    );
  }

  // ============================================================
  // markAttendanceReviewed  --- calls updateAttendanceStatus
  // ============================================================
  markAttendanceReviewed(row: any): void {
    const attendanceId = this.getAttendanceId(row);

    if (!attendanceId) {
      this.dateRangeErrorMessage = 'لا يمكن اعتماد المراجعة لأن رقم سجل الحضور غير موجود';
      return;
    }

    if (!row.status) {
      this.dateRangeErrorMessage = 'لا يمكن اعتماد المراجعة لأن حالة السجل غير موجودة';
      return;
    }

    this.reviewingAttendanceId = attendanceId;
    this.dateRangeErrorMessage = '';
    this.dateRangeSuccessMessage = '';

    const payload = {
      status: row.status,
      note: 'تمت المراجعة',
    };

    this.attendanceService.updateAttendanceStatus(attendanceId, payload).subscribe({
      next: (response: any) => {
        console.log('Mark Attendance Reviewed Response:', response);

        if (response?.isSuccess === false) {
          this.dateRangeErrorMessage = this.translateApiMessage(
            response?.message,
            'فشل اعتماد مراجعة سجل الحضور',
          );
          this.reviewingAttendanceId = null;
          return;
        }

        row.notes = this.appendReviewNoteToNotes(row.notes);
        row.isReviewed = true;

        if (this.notesModalOpen && this.notesModalRow === row) {
          this.notesModalEntries = this.getAttendanceNotes(row.notes);
          this.notesModalRow = row;
        }

        this.dateRangeSuccessMessage = 'تم اعتماد مراجعة السجل بنجاح';
        this.reviewingAttendanceId = null;
      },
      error: (err) => {
        console.log('Mark attendance reviewed error:', err);

        this.dateRangeErrorMessage = this.translateApiMessage(
          err?.error?.message || err?.message || 'حدث خطأ أثناء اعتماد مراجعة سجل الحضور',
          'حدث خطأ أثناء اعتماد مراجعة سجل الحضور',
        );

        this.reviewingAttendanceId = null;
      },
    });
  }

  // ============================================================
  // onDragLeave
  // ============================================================
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  // ============================================================
  // onFileDrop
  // ============================================================
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer?.files?.[0];

    if (!file) {
      return;
    }

    this.readAttendanceFile(file);
  }

  // ============================================================
  // readAttendanceFile (private) --- Excel/CSV parsing entrypoint
  // ============================================================
  private async readAttendanceFile(file: File): Promise<void> {
    this.excelFileName = file.name;
    this.attendanceRows = [];
    this.sheetPreviewRows = [];
    this.sheetPreviewHeaders = [];
    this.successMessage = '';
    this.errorMessage = '';
    this.rowErrors = [];
    this.isImporting = false;
    this.hasImportedCurrentSheet = false;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'xlsx' && extension !== 'xls' && extension !== 'csv') {
      this.errorMessage = 'من فضلك قم برفع ملف Excel أو CSV بصيغة xlsx أو xls أو csv فقط';
      return;
    }

    try {
      let workbook: WorkBook;

      if (extension === 'csv') {
        const csvText = await file.text();

        workbook = read(csvText, {
          type: 'string',
          cellDates: true,
        });
      } else {
        const arrayBuffer = await file.arrayBuffer();

        workbook = read(arrayBuffer, {
          type: 'array',
          cellDates: true,
        });
      }

      if (!workbook.SheetNames.length) {
        this.errorMessage = 'الملف لا يحتوي على Sheets أو بيانات';
        return;
      }

      const attendanceMap = new Map<string, AttendancePayload>();
      const fingerprintPunches: FingerprintPunch[] = [];

      workbook.SheetNames.forEach((sheetName: string) => {
        const worksheet: WorkSheet = workbook.Sheets[sheetName];

        const rows = utils.sheet_to_json(worksheet, {
          defval: '',
          raw: true,
        }) as any[];

        rows.forEach((row, index) => {
          if (!this.isEmptyRow(row)) {
            const previewRow: { [key: string]: any } = {
              ...row,
              __sheetName: sheetName,
              __rowNumber: index + 2,
            };

            this.sheetPreviewRows.push(previewRow);
          }

          if (this.isEmptyRow(row)) {
            return;
          }

          const directAttendance = this.mapAttendanceRow(row, sheetName);

          if (directAttendance) {
            const missing = this.getMissingFields(directAttendance);

            if (missing.length === 0) {
              const key = `${directAttendance.employeeCode}_${directAttendance.date}`;

              if (!attendanceMap.has(key)) {
                attendanceMap.set(key, directAttendance);
              }

              return;
            }

            this.rowErrors.push(
              `Sheet ${sheetName} - صف رقم ${index + 2}: بيانات ناقصة أو غير صحيحة: ${missing.join(' - ')} - ${JSON.stringify(row)}`,
            );

            return;
          }

          const punch = this.mapFingerprintPunchRow(row, sheetName);

          if (punch) {
            fingerprintPunches.push(punch);
            return;
          }

          this.rowErrors.push(
            `Sheet ${sheetName} - صف رقم ${index + 2}: لا يمكن قراءة الصف - ${JSON.stringify(row)}`,
          );
        });
      });

      fingerprintPunches.forEach((punch) => {
        const attendance = {
          employeeCode: punch.employeeCode,
          date: punch.date,
          actualIn: punch.time,
          actualOut: null,
        } as AttendancePayload;

        const key = `${attendance.employeeCode}_${attendance.date}`;

        if (!attendanceMap.has(key)) {
          attendanceMap.set(key, attendance);
        }
      });

      this.attendanceRows = Array.from(attendanceMap.values());

      if (this.attendanceRows.length === 0) {
        this.errorMessage = 'لم يتم استخراج بيانات حضور صحيحة من الملف';
        return;
      }

      this.sheetPreviewHeaders = this.getSheetPreviewHeaders(this.sheetPreviewRows);

      this.successMessage = `تم استخراج ${this.attendanceRows.length} سجل حضور من الملف`;

      console.log('Attendance JSON:', this.attendanceRows);
      console.log('Attendance Row Errors:', this.rowErrors);
      console.table(this.rowErrors.slice(0, 30));

      this.importAttendance();
    } catch (error) {
      console.log(error);
      this.errorMessage = 'حدث خطأ أثناء قراءة ملف الحضور';
    }
  }

  // ============================================================
  // getSheetPreviewHeaders (private)
  // ============================================================
  private getSheetPreviewHeaders(rows: Array<{ [key: string]: any }>): string[] {
    const headers = new Set<string>();

    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== '__sheetName' && key !== '__rowNumber') {
          headers.add(key);
        }
      });
    });

    return Array.from(headers);
  }

  // ============================================================
  // formatRawTimeValue (private)
  // ============================================================
  private formatRawTimeValue(value: any): string | null {
    if (value === null || value === undefined || String(value).trim() === '') {
      return null;
    }

    if (value instanceof Date) {
      // Date object جاية من تحويل تلقائي للمكتبة - رجّعها بصيغة وقت نضيفة
      // مطابقة تمامًا للأصل في الشيت (اتأكدنا إن getHours/getMinutes/getSeconds صح)
      return `${this.pad(value.getHours())}:${this.pad(value.getMinutes())}:${this.pad(value.getSeconds())}`;
    }
    // string خام أصلاً (زي "00:01:53 (+1)" أو "-") - رجّعه زي ما هو بالظبط
    return String(value).trim();
  }

  // ============================================================
  // mapAttendanceRow (private) --- Excel row -> AttendancePayload
  // ============================================================
  private mapAttendanceRow(row: any, sheetName: string): AttendancePayload | null {
    const employeeCode = String(
      this.getCellValue(row, [
        'كود الموظف',
        'employeeCode',
        'EmployeeCode',
        'Employee Code',
        'code',
        'Code',
        'User ID',
        'UserID',
        'PIN',
        'ID',
        'No.',
      ]),
    ).trim();

    const employeeName = String(
      this.getCellValue(row, ['اسم الموظف', 'Name', 'name', 'Employee Name', 'EmployeeName']),
    ).trim();

    const departmentRaw = String(
      this.getCellValue(row, ['القسم', 'Department', 'department', 'Dept', 'DepartmentName']),
    ).trim();

    const dateRaw =
      this.getCellValue(row, ['التاريخ', 'date', 'Date', 'attendanceDate', 'Attendance Date']) ||
      sheetName;

    const actualInRaw = this.getCellValue(row, [
      'وقت الحضور',
      'الحضور',
      'actualIn',
      'ActualIn',
      'Actual In',
      'Check In',
      'In',
      'Clock In',
    ]);

    const actualOutRaw = this.getCellValue(row, [
      'وقت الانصراف',
      'الانصراف',
      'actualOut',
      'ActualOut',
      'Actual Out',
      'Check Out',
      'Out',
      'Clock Out',
    ]);

    if (!employeeCode) {
      return null;
    }

    const actualInRawStr = this.formatRawTimeValue(actualInRaw);
    const actualOutRawStr = this.formatRawTimeValue(actualOutRaw);

    return {
      employeeCode,
      employeeName: employeeName || undefined,
      departmentRaw: departmentRaw || undefined,
      date: this.normalizeExcelDate(dateRaw),
      actualIn: this.normalizeExcelTime(actualInRaw),
      actualOut: this.normalizeExcelTime(actualOutRaw),
      actualInRaw: actualInRawStr,
      actualOutRaw: actualOutRawStr,
    };
  }

  // ============================================================
  // mapFingerprintPunchRow (private) --- Excel row -> FingerprintPunch
  // ============================================================
  private mapFingerprintPunchRow(row: any, sheetName: string): FingerprintPunch | null {
    const employeeCode = String(
      this.getCellValue(row, [
        'كود الموظف',
        'employeeCode',
        'EmployeeCode',
        'Employee Code',
        'code',
        'Code',
        'User ID',
        'UserID',
        'PIN',
        'ID',
        'No.',
      ]),
    ).trim();

    const dateRaw =
      this.getCellValue(row, ['التاريخ', 'date', 'Date', 'attendanceDate', 'Attendance Date']) ||
      sheetName;

    const timeRaw = this.getCellValue(row, [
      'وقت البصمة',
      'وقت',
      'time',
      'Time',
      'Punch Time',
      'PunchTime',
      'Verify Time',
      'VerifyTime',
      'Transaction Time',
    ]);

    const dateTimeRaw = this.getCellValue(row, [
      'DateTime',
      'Date Time',
      'Punch DateTime',
      'Verify Time',
      'Transaction Time',
      'التاريخ والوقت',
      'تاريخ ووقت',
    ]);

    if (!employeeCode) {
      return null;
    }

    if (dateTimeRaw) {
      const parsed = this.splitDateTime(dateTimeRaw);

      if (parsed.date && parsed.time) {
        return {
          employeeCode,
          date: parsed.date,
          time: parsed.time,
        };
      }
    }

    const date = this.normalizeExcelDate(dateRaw);
    const time = this.normalizeExcelTime(timeRaw);

    if (!date || !time || !this.isValidDateString(date) || !this.isValidTimeString(time)) {
      return null;
    }

    return {
      employeeCode,
      date,
      time,
    };
  }

  // ============================================================
  // splitDateTime (private)
  // ============================================================
  private splitDateTime(value: any): { date: string; time: string } {
    if (!value) {
      return { date: '', time: '' };
    }

    if (value instanceof Date) {
      return {
        date: this.formatDate(value),
        time: `${this.pad(value.getHours())}:${this.pad(value.getMinutes())}:${this.pad(value.getSeconds())}`,
      };
    }

    const text = String(value).trim();

    const isoMatch = text.match(
      /^(\d{4}[-/]\d{1,2}[-/]\d{1,2})[ T]+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)$/i,
    );

    if (isoMatch) {
      const normalizedTime = this.normalizeExcelTime(isoMatch[2]);

      return {
        date: this.normalizeExcelDate(isoMatch[1]),
        time: normalizedTime || '',
      };
    }

    const normalMatch = text.match(
      /^(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)$/i,
    );

    if (normalMatch) {
      const normalizedTime = this.normalizeExcelTime(normalMatch[2]);

      return {
        date: this.normalizeExcelDate(normalMatch[1]),
        time: normalizedTime || '',
      };
    }

    return { date: '', time: '' };
  }

  // ============================================================
  // getMissingFields (private)
  // ============================================================
  private getMissingFields(row: AttendancePayload): string[] {
    const missing: string[] = [];

    if (!row.employeeCode) {
      missing.push('كود الموظف');
    }

    if (!row.date || !this.isValidDateString(row.date)) {
      missing.push('التاريخ');
    }

    return missing;
  }

  // ============================================================
  // importAttendance --- calls bulkImportAttendance
  // ============================================================
  importAttendance(): void {
    if (this.attendanceRows.length === 0) {
      this.errorMessage = 'لا توجد بيانات حضور صالحة للاستيراد';
      return;
    }

    if (this.hasImportedCurrentSheet) {
      return;
    }

    const invalidRows = this.attendanceRows.filter(
      (row) =>
        !this.isValidDateString(row.date) ||
        !this.isValidAttendanceTimeOrEmpty(row.actualIn) ||
        !this.isValidAttendanceTimeOrEmpty(row.actualOut),
    );

    if (invalidRows.length > 0) {
      console.table(invalidRows.slice(0, 20));
      this.errorMessage = `يوجد ${invalidRows.length} سجل حضور غير صحيح`;
      return;
    }

    this.isImporting = true;
    this.errorMessage = '';
    this.successMessage = 'جاري حفظ بيانات الحضور في السيستم...';

    console.log('Final Attendance Payload:', this.attendanceRows);

    this.attendanceService.bulkImportAttendance(this.attendanceRows).subscribe({
      next: (response: any) => {
        console.log('Bulk Attendance Response:', response);
        console.log('Bulk Attendance Response JSON:', JSON.stringify(response, null, 2));

        this.hasImportedCurrentSheet = true;
        this.isImporting = false;

        const responseData = response?.data || response;

        const successCount = responseData?.successCount ?? 0;
        const skippedCount = responseData?.skippedCount ?? 0;
        const failedCount = responseData?.failedCount ?? 0;

        const importResults =
          responseData?.results ||
          responseData?.items ||
          responseData?.details ||
          responseData?.errors ||
          [];

        console.log('Attendance import results:');
        console.table(importResults);

        const successRows = importResults.filter(
          (item: any) => String(item?.status || '').toLowerCase() === 'success',
        );

        const skippedRows = importResults.filter(
          (item: any) => String(item?.status || '').toLowerCase() === 'skipped',
        );

        const failedRows = importResults.filter(
          (item: any) => String(item?.status || '').toLowerCase() === 'failed',
        );

        console.log('Success rows:', successRows.length);
        console.table(successRows);

        console.log('Skipped rows:', skippedRows.length);
        console.table(skippedRows.slice(0, 30));

        console.log('Failed rows:', failedRows.length);
        console.table(failedRows);

        this.successMessage = `تم الاستيراد: ${successCount} سجل اتحفظ، ${skippedCount} تم تخطيه، ${failedCount} فشل.`;

        if (failedCount > 0) {
          const failureDetails = failedRows
            .map((item: any) => {
              const message = item?.message || item?.errorMessage || item?.error || item?.details || item?.reason || item?.statusMessage || '';
              const employeeCode = item?.employeeCode || item?.employee?.employeeCode || item?.employeeCode || '';
              const rowNumber = item?.rowNumber || item?.row || item?.index;

              const parts = [message, employeeCode ? `رمز الموظف: ${employeeCode}` : '', rowNumber ? `الصف: ${rowNumber}` : ''].filter(Boolean);
              return parts.join(' | ');
            })
            .filter((item: string) => item && item.trim() !== '')
            .slice(0, 6);

          if (failureDetails.length > 0) {
            this.rowErrors = [...this.rowErrors, ...failureDetails];
            this.errorMessage = `فشل حفظ ${failedCount} سجل حضور. ${failureDetails.join(' | ')}`;
          } else {
            this.errorMessage = `فشل حفظ ${failedCount} سجل حضور.`;
          }
        }
      },
      error: (err) => {
        console.log('Bulk attendance error:', err);

        this.isImporting = false;
        this.errorMessage = this.translateApiMessage(
          err?.error?.message || err?.message || 'حدث خطأ أثناء حفظ بيانات الحضور في السيستم',
          'حدث خطأ أثناء حفظ بيانات الحضور في السيستم',
        );
      },
    });
  }

  // ============================================================
  // loadAttendanceByDateRange  ★★★ getAttendanceByDateRange call #1 (main load, single page)
  // ============================================================
  loadAttendanceByDateRange(): void {
    if (!this.dateRangeFrom || !this.dateRangeTo) {
      this.dateRangeErrorMessage = 'من فضلك قم بإختيار تاريخ البداية والنهاية';
      return;
    }

    this.isLoadingDateRange = true;
    this.dateRangeErrorMessage = '';
    this.dateRangeSuccessMessage = '';

    this.attendanceService
      .getAttendanceByDateRange(
        this.dateRangeFrom,
        this.dateRangeTo,
        this.dateRangeDepartmentId,
        this.dateRangeStatus,
        this.dateRangePageNumber,
        this.dateRangePageSize,
        this.dateRangeRoute,
        this.employeeSearchTerm || null,
        this.selectedLocationId,
        this.dateRangeNeedsReview,
      )
      .subscribe({
        next: (response: any) => {
          console.log('Attendance Date Range Response:', response);

          const data = response?.data || response;

          if (Array.isArray(data?.items)) {
            this.dateRangeRows = this.prepareDateRangeRows(data.items);

            const incomingPageNumber = Number(data.pageNumber) || 1;
            const incomingPageSize = Number(data.pageSize) || this.dateRangePageSize;
            const incomingTotalCount = Number(data.totalCount) || 0;
            const incomingTotalPages = Number(data.totalPages) || 0;

            this.dateRangePageNumber = Math.min(
              Math.max(incomingPageNumber, 1),
              incomingTotalPages || incomingPageNumber || 1,
            );
            this.dateRangePageSize = incomingPageSize || this.dateRangePageSize;
            this.dateRangeTotalCount = incomingTotalCount;
            this.dateRangeTotalPages = incomingTotalPages;
          } else if (Array.isArray(data)) {
            this.dateRangeRows = this.prepareDateRangeRows(data);

            this.dateRangePageNumber = 1;
            this.dateRangeTotalCount = data.length;
            this.dateRangeTotalPages = 1;
          } else {
            this.dateRangeRows = [];
            this.dateRangeTotalCount = 0;
            this.dateRangeTotalPages = 0;
          }

          this.dateRangeSuccessMessage = `تم تحميل ${this.dateRangeTotalCount || this.dateRangeRows.length} سجل حضور`;

          this.isLoadingDateRange = false;
        },
        error: (err) => {
          console.log('Attendance date range error:', err);

          this.dateRangeRows = [];
          this.dateRangeErrorMessage = this.translateApiMessage(
            err?.error?.message ||
              err?.error?.title ||
              err?.message ||
              'حدث خطأ أثناء تحميل سجلات الحضور',
            'حدث خطأ أثناء تحميل سجلات الحضور',
          );

          this.isLoadingDateRange = false;
        },
      });
  }

  // ============================================================
  // applyDateRangeFilter --- entry point that decides: searchEmployee() OR loadAttendanceByDateRange()
  // ============================================================
  applyDateRangeFilter(): void {
    const fromApiDate = this.displayDateToApi(this.dateRangeFromDisplay);
    const toApiDate = this.displayDateToApi(this.dateRangeToDisplay);

    if (!fromApiDate || !toApiDate) {
      this.dateRangeErrorMessage = 'من فضلك اكتب التاريخ بطريقة صحيحة مثل: 31/03/2026';
      return;
    }

    this.dateRangeFrom = fromApiDate;
    this.dateRangeTo = toApiDate;

    this.dateRangeFromDisplay = this.apiDateToDisplay(fromApiDate);
    this.dateRangeToDisplay = this.apiDateToDisplay(toApiDate);

    this.dateRangePageNumber = 1;
    this.loadAttendanceByDateRange();
  }

  // ============================================================
  // onEmployeeSearchInputChange
  // ============================================================
  onEmployeeSearchInputChange(): void {
    const trimmedValue = String(this.employeeSearchTerm || '').trim();

    if (!trimmedValue) {
      this.dateRangePageNumber = 1;
      this.dateRangeErrorMessage = '';
      this.dateRangeSuccessMessage = '';
      this.loadAttendanceByDateRange();
    }
  }

  // ============================================================
  // searchEmployee  ★★★ getAttendanceByDateRange call #2 (paginated fetch-all + CLIENT-SIDE re-filter)
  // NOTE: server already receives employeeSearchTerm as a filter param below,
  // then this function ALSO re-filters the results client-side by name/code.
  // ============================================================
  async searchEmployee(): Promise<void> {
    if (!this.dateRangeFrom || !this.dateRangeTo) {
      this.dateRangeErrorMessage = 'من فضلك قم بإختيار تاريخ البداية والنهاية';
      return;
    }

    this.isLoadingDateRange = true;
    this.dateRangeErrorMessage = '';
    this.dateRangeSuccessMessage = '';

    const searchNorm = this.normalizeArabicText(this.employeeSearchTerm || '');
    if (!searchNorm) {
      this.isLoadingDateRange = false;
      this.loadAttendanceByDateRange();
      return;
    }

    const perPage = 1000; // fetch up to 1000 rows per request to reduce paging
    let page = 1;
    let totalPages = 1;

    try {
      const allMatches: any[] = [];

      while (page <= totalPages) {
        const resp: any = await firstValueFrom(
          this.attendanceService.getAttendanceByDateRange(
            this.dateRangeFrom,
            this.dateRangeTo,
            this.dateRangeDepartmentId,
            this.dateRangeStatus,
            page,
            perPage,
            this.dateRangeRoute,
            this.employeeSearchTerm || null,
            this.selectedLocationId,
            this.dateRangeNeedsReview,
          ),
        );

        const data = resp?.data || resp;
        let items: any[] = [];

        if (Array.isArray(data?.items)) {
          items = data.items;
          totalPages = data.totalPages || 1;
          this.dateRangeTotalCount = data.totalCount || this.dateRangeTotalCount;
        } else if (Array.isArray(data)) {
          items = data;
          totalPages = 1;
          this.dateRangeTotalCount = items.length;
        } else {
          items = [];
          totalPages = 0;
        }

        const prepared = this.prepareDateRangeRows(items);

        const matches = prepared.filter((row: any) => {
          const employeeName = this.normalizeArabicText(
            row.employeeName || row.name || row.employee?.name || '',
          );

          const employeeCode = this.normalizeArabicText(
            row.employeeCode || row.employee?.employeeCode || '',
          );

          return employeeName.includes(searchNorm) || employeeCode.includes(searchNorm);
        });

        if (matches.length > 0) {
          allMatches.push(...matches);
        }

        if (page >= totalPages) {
          break;
        }

        page++;
      }

      if (allMatches.length > 0) {
        this.dateRangeRows = allMatches;
        this.dateRangePageNumber = 1;
        this.dateRangePageSize = perPage;
        this.dateRangeTotalPages = 1;
        this.dateRangeTotalCount = allMatches.length;
        this.dateRangeSuccessMessage = `تم العثور على ${allMatches.length} نتيجة`;
      } else {
        this.dateRangeRows = [];
        this.dateRangeTotalCount = 0;
        this.dateRangeTotalPages = 0;
        this.dateRangeErrorMessage = 'لم يتم العثور على الموظف ضمن النطاق المحدد';
      }
    } catch (err: any) {
      console.log('Search employee error:', err);
      this.dateRangeErrorMessage =
        err?.error?.message || err?.message || 'حدث خطأ أثناء البحث عن الموظف';
    } finally {
      this.isLoadingDateRange = false;
    }
  }

  // ============================================================
  // clearDateRangeFilter
  // ============================================================
  clearDateRangeFilter(): void {
    this.dateRangeFrom = '';
    this.dateRangeTo = '';
    this.selectedLocationId = null;
    this.dateRangeDepartmentId = null;
    this.initializeDepartments();
    this.dateRangeStatus = '';
    this.dateRangeNeedsReview = null;

    this.dateRangeRoute = '';
    this.dateRangePageNumber = 1;
    this.dateRangeRows = [];
    this.dateRangeTotalCount = 0;
    this.dateRangeTotalPages = 0;
    this.dateRangeErrorMessage = '';
    this.dateRangeSuccessMessage = '';
    this.employeeSearchTerm = '';
    this.dateRangeFromDisplay = '';
    this.dateRangeToDisplay = '';
  }

  // ============================================================
  // nextDateRangePage
  // ============================================================
  nextDateRangePage(): void {
    if (this.dateRangePageNumber < this.dateRangeTotalPages) {
      this.dateRangePageNumber++;
      this.loadAttendanceByDateRange();
    }
  }

  // ============================================================
  // previousDateRangePage
  // ============================================================
  previousDateRangePage(): void {
    if (this.dateRangePageNumber > 1) {
      this.dateRangePageNumber--;
      this.loadAttendanceByDateRange();
    }
  }

  // ============================================================
  // prepareDateRangeRows (private) --- currently a no-op passthrough (spreads row only)
  // ============================================================
  private prepareDateRangeRows(rows: any[]): any[] {
    return rows.map((row: any) => ({
      ...row,
    }));
  }

  // ============================================================
  // openNotesModal
  // ============================================================
  openNotesModal(row: any): void {
    this.notesModalTitle = row?.employeeName || row?.name || row?.employee?.name || 'الملاحظات';
    this.notesModalEntries = this.getAttendanceNotes(row?.notes);
    this.notesModalRow = row;
    this.notesModalOpen = true;
  }

  // ============================================================
  // closeNotesModal
  // ============================================================
  closeNotesModal(): void {
    this.notesModalOpen = false;
    this.notesModalTitle = '';
    this.notesModalEntries = [];
    this.notesModalRow = null;
  }

  // ============================================================
  // openAttendanceEdit
  // ============================================================
  openAttendanceEdit(row: any): void {
    const attendanceId = row.id || row.attendanceId;

    if (!attendanceId) {
      this.dateRangeErrorMessage = 'لا يمكن تعديل هذا السجل لأن رقم سجل الحضور غير موجود';
      return;
    }

    this.selectedAttendanceForEdit = row;

    this.attendanceEditId = attendanceId;
    this.attendanceEditEmployeeCode = row.employeeCode || row.employee?.employeeCode || '';

    this.attendanceEditEmployeeName = row.employeeName || row.name || row.employee?.name || '';

    this.attendanceEditDepartmentName = row.departmentName || row.employee?.departmentName || '';

    this.attendanceEditDate = row.date || row.attendanceDate || '';

    this.attendanceEditActualIn = this.timeForInput(row.actualIn);
    this.attendanceEditActualOut = this.timeForInput(row.actualOut);

    this.attendanceEditStatus = row.status || '';
    this.attendanceEditNotes = '';

    this.attendanceEditErrorMessage = '';
    this.attendanceEditSuccessMessage = '';

    this.activeAttendancePage = 'edit';
  }

  // ============================================================
  // cancelAttendanceEdit
  // ============================================================
  cancelAttendanceEdit(): void {
    this.selectedAttendanceForEdit = null;
    this.attendanceEditId = null;

    this.attendanceEditEmployeeCode = '';
    this.attendanceEditEmployeeName = '';
    this.attendanceEditDepartmentName = '';
    this.attendanceEditDate = '';
    this.attendanceEditActualIn = '';
    this.attendanceEditActualOut = '';
    this.attendanceEditStatus = '';
    this.attendanceEditNotes = '';

    this.attendanceEditErrorMessage = '';
    this.attendanceEditSuccessMessage = '';

    this.activeAttendancePage = 'report';
  }

  // ============================================================
  // saveAttendanceEdit --- calls updateAttendanceTime then updateAttendanceStatus
  // ============================================================
  saveAttendanceEdit(): void {
    if (!this.attendanceEditId) {
      this.attendanceEditErrorMessage = 'رقم سجل الحضور غير موجود';
      return;
    }

    const originalActualIn = this.normalizeTimeForApi(this.selectedAttendanceForEdit?.actualIn);
    const originalActualOut = this.normalizeTimeForApi(this.selectedAttendanceForEdit?.actualOut);

    const sourceActualIn = this.normalizeTimeForApi(
      this.attendanceEditActualIn || this.selectedAttendanceForEdit?.actualIn,
    );
    const sourceActualOut = this.normalizeTimeForApi(
      this.attendanceEditActualOut || this.selectedAttendanceForEdit?.actualOut,
    );
    const notes = String(this.attendanceEditNotes || '').trim();

    let finalStatus = String(this.attendanceEditStatus || '').trim();

    const explicitAbsentStatuses = ['Absent', 'غائب'];
    const shouldPreserveExplicitAbsentStatus = explicitAbsentStatuses.includes(finalStatus);

    if (
      !shouldPreserveExplicitAbsentStatus &&
      sourceActualIn &&
      sourceActualOut &&
      (finalStatus === '' ||
        finalStatus === 'MissingIn' ||
        finalStatus === 'MissingOut' ||
        finalStatus === 'Incomplete')
    ) {
      finalStatus = 'Present';
    }

    if (!finalStatus) {
      this.attendanceEditErrorMessage = 'من فضلك قم بإختيار الحالة أو أدخل وقت الحضور والانصراف';
      return;
    }

    const timePayload = {
      actualIn: sourceActualIn,
      actualOut: sourceActualOut,
      note: '',
    };

    const statusPayload = {
      status: finalStatus,
      note: notes,
    };

    console.log('Attendance Edit ID:', this.attendanceEditId);
    console.log('Time Payload:', timePayload);
    console.log('Status Payload:', statusPayload);

    this.isSavingAttendanceEdit = true;
    this.attendanceEditErrorMessage = '';
    this.attendanceEditSuccessMessage = '';

    const finishStatusSave = () => {
      this.attendanceService
        .updateAttendanceStatus(this.attendanceEditId!, statusPayload)
        .subscribe({
          next: (statusResponse: any) => {
            console.log('Update Attendance Status Response:', statusResponse);

            if (statusResponse?.isSuccess === false) {
              this.attendanceEditErrorMessage =
                statusResponse?.message || 'تم تعديل الوقت ولكن فشل تعديل الحالة';
              this.isSavingAttendanceEdit = false;
              return;
            }

            this.attendanceEditStatus = finalStatus;
            this.attendanceEditSuccessMessage = 'تم تعديل سجل الحضور بنجاح';

            this.selectedAttendanceForEdit = {
              ...this.selectedAttendanceForEdit,
              status: finalStatus,
              notes: notes || this.selectedAttendanceForEdit?.notes,
            };

            this.dateRangeRows = this.dateRangeRows.map((row: any) => {
              const rowId = row.id || row.attendanceId;
              if (rowId === this.attendanceEditId) {
                return {
                  ...row,
                  status: finalStatus,
                  notes: notes || row.notes || this.selectedAttendanceForEdit?.notes,
                };
              }

              return row;
            });

            this.isSavingAttendanceEdit = false;

            this.activeAttendancePage = 'report';
            this.loadAttendanceByDateRange();
          },
          error: (err: any) => {
            console.log('Update attendance status error:', err);

            this.attendanceEditErrorMessage = this.getApiErrorMessage(err);
            this.isSavingAttendanceEdit = false;
          },
        });
    };

    const hasTimeChange =
      sourceActualIn !== originalActualIn || sourceActualOut !== originalActualOut;

    const shouldUpdateTime = hasTimeChange;

    if (shouldUpdateTime) {
      this.attendanceService.updateAttendanceTime(this.attendanceEditId, timePayload).subscribe({
        next: (timeResponse: any) => {
          console.log('Update Attendance Time Response:', timeResponse);

          if (timeResponse?.isSuccess === false) {
            this.attendanceEditErrorMessage =
              timeResponse?.message || 'فشل تعديل وقت الحضور والانصراف';
            this.isSavingAttendanceEdit = false;
            return;
          }

          finishStatusSave();
        },
        error: (err: any) => {
          console.log('Update attendance time error:', err);

          this.attendanceEditErrorMessage = this.getApiErrorMessage(err);
          this.isSavingAttendanceEdit = false;
        },
      });
      return;
    }

    finishStatusSave();
  }

  // ============================================================
  // resolveAttendanceStatusAfterTimeEdit --- UNUSED? not called anywhere in this file
  // ============================================================
  resolveAttendanceStatusAfterTimeEdit(
    currentStatus: string | null | undefined,
    actualIn: string | null,
    actualOut: string | null,
  ): string {
    const status = String(currentStatus || '').trim();

    const hasActualIn = !!String(actualIn || '').trim();
    const hasActualOut = !!String(actualOut || '').trim();

    // لو مفيش حضور وانصراف مع بعض، سيبي الحالة زي ما هي
    if (!hasActualIn || !hasActualOut) {
      return status;
    }

    // الحالات اللي لو اتضاف لها حضور وانصراف تتحول لحاضر
    const absentStatuses = [
      '',
      'Absent',
      'غائب',
      'MissingIn',
      'MissingOut',
      'Incomplete',
      'حضور ناقص',
      'انصراف ناقص',
      'بيانات ناقصة',
    ];

    if (absentStatuses.includes(status)) {
      return 'Present';
    }

    // لو المستخدم مختار Late أو EarlyDeparture سيبيها زي ما هي
    return status;
  }

  // ============================================================
  // onLateSummarySearchInput --- debounced trigger for loadLateSummary
  // ============================================================
  onLateSummarySearchInput(): void {
    this.lateSummaryPageNumber = 1;
  }

  onLateSummaryLocationOrDepartmentChange(): void {
    this.lateSummaryPageNumber = 1;
  }

  // ============================================================
  // previousLateSummaryPage
  // ============================================================
  previousLateSummaryPage(): void {
    if (this.lateSummaryPageNumber > 1) {
      this.lateSummaryPageNumber--;
      this.loadLateSummary();
    }
  }

  // ============================================================
  // nextLateSummaryPage
  // ============================================================
  nextLateSummaryPage(): void {
    if (this.lateSummaryPageNumber < this.lateSummaryTotalPages) {
      this.lateSummaryPageNumber++;
      this.loadLateSummary();
    }
  }

  // ============================================================
  // loadLateSummary  ★★★ getLateSummary call (server-side filter + pagination)
  // ============================================================
  loadLateSummary(): void {
    (async () => {
      const fromApiDate = this.displayDateToApi(this.lateSummaryFromDisplay);
      const toApiDate = this.displayDateToApi(this.lateSummaryToDisplay);

      if (!fromApiDate || !toApiDate) {
        this.lateSummaryErrorMessage = 'من فضلك اكتب التاريخ بطريقة صحيحة مثل: 31/03/2026';
        return;
      }

      this.isLoadingLateSummary = true;
      this.lateSummaryErrorMessage = '';
      this.lateSummarySuccessMessage = '';

      this.lateSummaryFrom = fromApiDate;
      this.lateSummaryTo = toApiDate;
      this.lateSummaryFromDisplay = this.apiDateToDisplay(fromApiDate);
      this.lateSummaryToDisplay = this.apiDateToDisplay(toApiDate);

      try {
        const response = await firstValueFrom(
          this.attendanceService.getLateSummary(
            this.lateSummaryFrom,
            this.lateSummaryTo,
            this.lateSummaryEmployeeSearch?.trim() || null,
            this.lateSummaryDepartmentId,
            this.lateSummaryPageNumber,
            this.lateSummaryPageSize,
            this.lateSummaryLocationId,
          ),
        );

        const data = response?.data ?? response;

        if (Array.isArray(data?.items)) {
          this.lateSummaryRows = data.items;
          this.lateSummaryPageNumber = data.pageNumber || this.lateSummaryPageNumber;
          this.lateSummaryPageSize = data.pageSize || this.lateSummaryPageSize;
          this.lateSummaryTotalCount = data.totalCount || 0;
          this.lateSummaryTotalPages = data.totalPages || 0;
        } else if (Array.isArray(data)) {
          this.lateSummaryRows = data;
          this.lateSummaryPageNumber = 1;
          this.lateSummaryPageSize = this.lateSummaryPageSize;
          this.lateSummaryTotalCount = data.length;
          this.lateSummaryTotalPages = 1;
        } else {
          this.lateSummaryRows = [];
          this.lateSummaryTotalCount = 0;
          this.lateSummaryTotalPages = 0;
        }

        this.isLoadingLateSummary = false;
        this.lateSummaryData = this.lateSummaryRows;
        this.lateSummarySuccessMessage = 'تم عرض ملخص التأخير بنجاح';
      } catch (err: any) {
        this.isLoadingLateSummary = false;

        this.lateSummaryErrorMessage = this.translateApiMessage(
          err?.error?.message || err?.message || 'حدث خطأ أثناء جلب ملخص التأخير',
          'حدث خطأ أثناء جلب ملخص التأخير',
        );

        this.lateSummaryData = null;
        this.lateSummaryRows = [];
      }
    })();
  }

  // ============================================================
  // clearLateSummary
  // ============================================================
  clearLateSummary(): void {
    this.lateSummaryFrom = '';
    this.lateSummaryTo = '';
    this.lateSummaryFromDisplay = '';
    this.lateSummaryToDisplay = '';

    this.lateSummaryLocationId = null;
    this.lateSummaryEmployeeId = null;
    this.initializeDepartments();
    this.lateSummaryEmployeeSearch = '';

    this.lateSummarySelectedEmployee = null;
    this.lateSummaryDepartmentId = null;
    this.lateSummaryPageNumber = 1;
    this.lateSummaryPageSize = 10;
    this.lateSummaryTotalCount = 0;
    this.lateSummaryTotalPages = 0;

    this.lateSummaryData = null;
    this.lateSummaryRows = [];
    this.lateSummaryErrorMessage = '';
    this.lateSummarySuccessMessage = '';
  }

  // ============================================================
  // clearData --- resets the IMPORT page only
  // ============================================================
  clearData(): void {
    this.attendanceRows = [];
    this.excelFileName = '';
    this.successMessage = '';
    this.errorMessage = '';
    this.rowErrors = [];
    this.isImporting = false;
    this.hasImportedCurrentSheet = false;
  }

  // ============================================================
  // normalizeTimeForApi
  // ============================================================
  normalizeTimeForApi(value: string | null | undefined): string | null {
    if (!value || String(value).trim() === '') {
      return null;
    }

    let text = String(value).trim().toUpperCase();

    // يشيل (+1) أو -- لو موجودين
    text = text.replace(/\(\s*\+\s*\d+\s*\)/g, '').trim();
    text = text.replace(/\s*[-–—]{2,}\s*$/g, '').trim();

    // لو جاي HH:mm:ss.000Z نخليه HH:mm:ss
    const zMatch = text.match(/^(\d{1,2}):(\d{2}):(\d{2})\.\d{3}Z$/);
    if (zMatch) {
      return `${this.pad(Number(zMatch[1]))}:${zMatch[2]}:${zMatch[3]}`;
    }

    const isoTimeMatch = text.match(/(?:^|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (isoTimeMatch) {
      const hours = Number(isoTimeMatch[1]);
      const minutes = Number(isoTimeMatch[2]);
      const seconds = Number(isoTimeMatch[3] || 0);

      if (minutes > 59 || seconds > 59 || hours < 0 || hours > 23) {
        return null;
      }

      return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
    }

    // يقبل 09:00 أو 09:00:00 أو 12:15 PM
    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/);

    if (!match) {
      return null;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);
    const meridiem = match[4];

    if (minutes > 59 || seconds > 59) {
      return null;
    }

    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    }

    if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    if (hours < 0 || hours > 23) {
      return null;
    }

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  // ============================================================
  // timeForInput
  // ============================================================
  timeForInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const text = String(value).trim();
    const directMatch = text.match(/^(\d{1,2}):(\d{2})/);

    if (directMatch) {
      return `${directMatch[1]}:${directMatch[2]}`;
    }

    const isoMatch = text.match(/(?:^|T)(\d{1,2}):(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}:${isoMatch[2]}`;
    }

    return '';
  }

  // ============================================================
  // getCellValue (private) --- Excel helper: find value by any of several possible header names
  // ============================================================
  private getCellValue(row: any, possibleKeys: string[]): any {
    const rowKeys = Object.keys(row);

    for (const key of possibleKeys) {
      const matchedKey = rowKeys.find(
        (rowKey) => this.normalizeArabicText(rowKey) === this.normalizeArabicText(key),
      );

      if (
        matchedKey &&
        row[matchedKey] !== null &&
        row[matchedKey] !== undefined &&
        String(row[matchedKey]).trim() !== ''
      ) {
        return row[matchedKey];
      }
    }

    return '';
  }

  // ============================================================
  // normalizeExcelDate (private)
  // ============================================================
  private normalizeExcelDate(value: any): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return this.formatDate(value);
    }

    if (typeof value === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return this.formatDate(date);
    }

    const text = String(value).trim();

    const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);

      return `${year}-${this.pad(month)}-${this.pad(day)}`;
    }

    const fullDateMatch = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);

    if (fullDateMatch) {
      const first = Number(fullDateMatch[1]);
      const second = Number(fullDateMatch[2]);
      const year = Number(fullDateMatch[3]);

      let day: number;
      let month: number;

      if (first > 12) {
        day = first;
        month = second;
      } else {
        month = first;
        day = second;
      }

      return `${year}-${this.pad(month)}-${this.pad(day)}`;
    }

    const sheetDateMatch = text.match(/^(\d{1,2})-(\d{1,2})$/);

    if (sheetDateMatch) {
      const day = Number(sheetDateMatch[1]);
      const month = Number(sheetDateMatch[2]);
      const year = new Date().getFullYear();

      return `${year}-${this.pad(month)}-${this.pad(day)}`;
    }

    return text;
  }

  // ============================================================
  // formatDate (private) [FOURTH near-duplicate date formatter - used by Excel import path]
  // ============================================================
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());

    return `${year}-${month}-${day}`;
  }

  // ============================================================
  // normalizeExcelTime (private)
  // ============================================================
  private normalizeExcelTime(value: any): string | null {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === '' ||
      String(value).trim() === '-' ||
      String(value).trim() === '--'
    ) {
      return this.emptyAttendanceMarker;
    }

    if (typeof value === 'number') {
      const fraction = value % 1;
      const totalSeconds = Math.round(fraction * 24 * 60 * 60);
      return this.secondsToTime(totalSeconds);
    }

    if (value instanceof Date) {
      return `${this.pad(value.getHours())}:${this.pad(value.getMinutes())}:${this.pad(value.getSeconds())}`;
    }

    let text = String(value).trim().toUpperCase();

    text = text.replace(/\(\s*\+\s*\d+\s*\)/g, '').trim();

    if (text === '' || text === '-' || text === '--') {
      return this.emptyAttendanceMarker;
    }

    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/);

    if (!match) {
      return this.emptyAttendanceMarker;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);
    const meridiem = match[4];

    if (minutes > 59 || seconds > 59) {
      return this.emptyAttendanceMarker;
    }

    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    }

    if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    if (hours > 23) {
      return this.emptyAttendanceMarker;
    }

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  // ============================================================
  // timeToSeconds (private) --- UNUSED? not called anywhere in this file
  // ============================================================
  private timeToSeconds(value: string): number {
    if (!this.isValidTimeString(value)) {
      return 0;
    }

    const [hours, minutes, seconds] = value.split(':').map(Number);

    return hours * 3600 + minutes * 60 + seconds;
  }

  // ============================================================
  // isValidAttendanceTimeOrEmpty (private)
  // ============================================================
  private isValidAttendanceTimeOrEmpty(value: string | null): boolean {
    return value === null || this.isValidTimeString(value);
  }

  // ============================================================
  // isValidTimeString (private)
  // ============================================================
  private isValidTimeString(value: string): boolean {
    if (!value) {
      return false;
    }

    const match = String(value).match(/^(\d{2}):(\d{2}):(\d{2})$/);

    if (!match) {
      return false;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);

    return (
      hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59
    );
  }

  // ============================================================
  // isValidDateString (private)
  // ============================================================
  private isValidDateString(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  // ============================================================
  // secondsToTime (private)
  // ============================================================
  private secondsToTime(totalSeconds: number): string {
    const normalized = ((totalSeconds % 86400) + 86400) % 86400;

    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    const seconds = normalized % 60;

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  // ============================================================
  // isEmptyRow (private)
  // ============================================================
  private isEmptyRow(row: any): boolean {
    return Object.values(row).every(
      (value) => value === null || value === undefined || String(value).trim() === '',
    );
  }

  // ============================================================
  // normalizeArabicText (private) --- Arabic diacritics/letter normalization for fuzzy matching
  // ============================================================
  private normalizeArabicText(value: string): string {
    return String(value || '')
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[ًٌٍَُِّْ]/g, '')
      .replace(/[ـ]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  // ============================================================
  // pad (private)
  // ============================================================
  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  // ============================================================
  // formatMinutesToHoursLabel
  // ============================================================
  formatMinutesToHoursLabel(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const minutes = Number(value);

    if (Number.isNaN(minutes)) {
      return '-';
    }

    const totalHours = minutes / 60;

    if (!Number.isFinite(totalHours)) {
      return '-';
    }

    const wholeHours = Math.floor(totalHours);
    const remainingMinutes = Math.round((totalHours - wholeHours) * 60);

    if (remainingMinutes === 60) {
      return `${wholeHours + 1}:00`;
    }

    return `${wholeHours}:${remainingMinutes.toString().padStart(2, '0')}`;
  }

  // ============================================================
  // getAttendanceStatusLabel --- delegates to shared util (already unified per your message)
  // ============================================================
  getAttendanceStatusLabel(status: any): string {
    return getAttendanceStatusLabel(status);
  }

  // ============================================================
  // getStatusClass
  // ============================================================
  getStatusClass(status: string | null | undefined): string {
    const value = String(status || '').trim();

    switch (value) {
      case 'Present':
        return 'status-present';

      case 'Absent':
        return 'status-absent';

      case 'Late':
        return 'status-late';

      case 'EarlyDeparture':
        return 'status-early';

      case 'Permission':
      case 'Vacation':
      case 'Mission':
      case 'PersonalLeave':
      case 'DrivingRoute':
      case 'OnLeave':
        return 'status-permission';

      default:
        return 'status-default';
    }
  }

  // ============================================================
  // getNotesList --- NOTES TRANSLATION AREA #1
  // ============================================================
  getNotesList(notes: unknown): string[] {
    const normalized = this.normalizeNotesValue(notes);
    return normalized
      ? normalized
          .split(/[,،;]/)
          .map((note) => note.trim())
          .filter(Boolean)
      : [];
  }

  // ============================================================
  // getAttendanceNotes --- NOTES TRANSLATION AREA #2 (structured entries for modal)
  // ============================================================
  getAttendanceNotes(
    notes: unknown,
  ): Array<{ content: string; displayName?: string; createdAt?: string }> {
    type NoteEntry = { content: string; displayName?: string; createdAt?: string };

    if (Array.isArray(notes)) {
      const entries: NoteEntry[] = notes.reduce((acc, note) => {
        if (!note || typeof note !== 'object') {
          return acc;
        }

        const candidate = note as {
          content?: string;
          text?: string;
          note?: string;
          displayName?: string;
          createdBy?: string;
          createdAt?: string;
          createdOn?: string;
        };

        const content = this.normalizeNoteText(
          candidate.content || candidate.text || candidate.note,
        );
        if (!content) {
          return acc;
        }

        acc.push({
          content,
          displayName: this.normalizeNoteText(candidate.displayName || candidate.createdBy),
          createdAt: this.normalizeNoteText(candidate.createdAt || candidate.createdOn),
        });

        return acc;
      }, [] as NoteEntry[]);

      if (entries.length === 0) {
        return [];
      }

      return this.attachReviewMetadata(entries);
    }

    if (typeof notes === 'string') {
      return this.parseNotesString(notes);
    }

    if (typeof notes === 'object' && notes !== null) {
      const candidate = notes as {
        content?: string;
        text?: string;
        note?: string;
        displayName?: string;
        createdBy?: string;
        createdAt?: string;
        createdOn?: string;
      };

      const content = this.normalizeNoteText(candidate.content || candidate.text || candidate.note);
      if (!content) {
        return [];
      }

      return this.attachReviewMetadata([
        {
          content,
          displayName: this.normalizeNoteText(candidate.displayName || candidate.createdBy),
          createdAt: this.normalizeNoteText(candidate.createdAt || candidate.createdOn),
        },
      ]);
    }

    return [];
  }

  // ============================================================
  // parseNotesString (private) --- NOTES TRANSLATION AREA #3 (isReviewMarker check)
  // ============================================================
  private parseNotesString(
    notes: string,
  ): Array<{ content: string; displayName?: string; createdAt?: string }> {
    const normalized = this.normalizeNotesValue(notes);
    if (!normalized) {
      return [];
    }

    const parts = normalized
      .split(/[,،؛;]/)
      .map((part) => part.trim())
      .filter(Boolean);

    const entries: Array<{ content: string; displayName?: string; createdAt?: string }> = [];

    for (const part of parts) {
      if (this.isReviewMarker(part)) {
        if (entries.length > 0) {
          entries[entries.length - 1].displayName = this.getReviewNoteAuthor();
          entries[entries.length - 1].createdAt = new Date().toISOString();
        }
        continue;
      }

      entries.push({ content: part });
    }

    return entries.length > 0 ? entries : [];
  }

  // ============================================================
  // attachReviewMetadata (private)
  // ============================================================
  private attachReviewMetadata(
    entries: Array<{ content: string; displayName?: string; createdAt?: string }>,
  ) {
    return entries.map((entry) => {
      if (this.isReviewMarker(entry.content)) {
        return {
          content: entry.content,
          displayName: this.getReviewNoteAuthor(),
          createdAt: new Date().toISOString(),
        };
      }
      return entry;
    });
  }

  // ============================================================
  // getReviewNoteAuthor (private)
  // ============================================================
  private getReviewNoteAuthor(): string {
    return this.authService.getUserName() || 'المستخدم';
  }

  // ============================================================
  // isReviewMarker (private)
  // ============================================================
  private isReviewMarker(text: string): boolean {
    return /^(تمت المراجعة|reviewed)$/i.test(text.trim());
  }

  // ============================================================
  // getNotesLabel --- NOTES TRANSLATION AREA #4 (biggest one: reuses translateApiMessage + its OWN notesMap + its OWN includes() checks)
  // ============================================================
  getNotesLabel(notes: unknown): string {
    const value = this.normalizeNotesValue(notes);

    if (!value) {
      return 'لا توجد ملاحظات';
    }

    const translated = this.translateApiMessage(value, value);
    const lowerValue = translated.toLowerCase();

    if (
      lowerValue.includes('تمت المراجعة') ||
      lowerValue.includes('تمت مراجعه') ||
      lowerValue.includes('reviewed')
    ) {
      return 'تمت المراجعة';
    }

    if (
      lowerValue.includes('دخول بدون خروج') ||
      lowerValue.includes('حضور بدون انصراف') ||
      lowerValue.includes('checkin without checkout') ||
      lowerValue.includes('check-in without check-out') ||
      lowerValue.includes('check in without check out')
    ) {
      return 'حضور بدون انصراف - يحتاج مراجعة';
    }

    if (
      lowerValue.includes('خروج بدون دخول') ||
      lowerValue.includes('انصراف بدون حضور') ||
      lowerValue.includes('checkout without checkin') ||
      lowerValue.includes('check-out without check-in') ||
      lowerValue.includes('check out without check in')
    ) {
      return 'انصراف بدون حضور - يحتاج مراجعة';
    }

    if (lowerValue.includes('يحتاج مراجعة')) {
      return 'يحتاج مراجعة';
    }

    const notesMap: Record<string, string> = {
      'Checkin without checkout - needs review': 'حضور بدون انصراف - يحتاج مراجعة',
      'Checkout without checkin - needs review': 'انصراف بدون حضور - يحتاج مراجعة',
      'checkin without checkout - needs review': 'حضور بدون انصراف - يحتاج مراجعة',
      'checkout without checkin - needs review': 'انصراف بدون حضور - يحتاج مراجعة',
      'Missing checkin': 'حضور ناقص',
      'Missing checkout': 'انصراف ناقص',
      'No checkin': 'لا يوجد حضور',
      'No checkout': 'لا يوجد انصراف',
      'Manual update': 'تعديل يدوي',
      'Approved manually': 'تم الاعتماد يدويًا',
      'needs review': 'يحتاج مراجعة',
      'needs revision': 'يحتاج مراجعة',
      reviewed: 'تمت المراجعة',
    };

    return translated || notesMap[value] || value;
  }

  // ============================================================
  // normalizeNotesForEditor (private) --- UNUSED? not called anywhere in this file
  // ============================================================
  private normalizeNotesForEditor(notes: unknown): string {
    return this.normalizeNotesValue(notes) || '';
  }

  // ============================================================
  // appendReviewNoteToNotes (private) --- adds "تمت المراجعة" marker; handles array/object/string shapes
  // ============================================================
  private appendReviewNoteToNotes(notes: unknown): unknown {
    const reviewNoteContent = 'تمت المراجعة';
    const normalized = this.normalizeNotesValue(notes);

    if (Array.isArray(notes)) {
      const existingNotes: Array<{ content: string; displayName?: string; createdAt?: string }> =
        notes.reduce(
          (acc, note) => {
            if (!note || typeof note !== 'object') {
              return acc;
            }

            const candidate = note as {
              content?: string;
              text?: string;
              note?: string;
              displayName?: string;
              createdBy?: string;
              createdAt?: string;
              createdOn?: string;
            };

            const content = this.normalizeNoteText(
              candidate.content || candidate.text || candidate.note,
            );
            if (!content) {
              return acc;
            }

            acc.push({
              content,
              displayName: this.normalizeNoteText(candidate.displayName || candidate.createdBy),
              createdAt: this.normalizeNoteText(candidate.createdAt || candidate.createdOn),
            });

            return acc;
          },
          [] as Array<{ content: string; displayName?: string; createdAt?: string }>,
        );

      if (
        existingNotes.some(
          (note) =>
            note.content.includes(reviewNoteContent) ||
            note.content.toLowerCase().includes('reviewed'),
        )
      ) {
        return notes;
      }

      return [
        ...existingNotes,
        { content: reviewNoteContent, createdAt: new Date().toISOString() },
      ];
    }

    if (typeof notes === 'object' && notes !== null) {
      const candidate = notes as {
        content?: string;
        text?: string;
        note?: string;
        displayName?: string;
        createdBy?: string;
        createdAt?: string;
        createdOn?: string;
      };

      const content = this.normalizeNoteText(candidate.content || candidate.text || candidate.note);
      const noteObject = content
        ? {
            content,
            displayName: this.normalizeNoteText(candidate.displayName || candidate.createdBy),
            createdAt: this.normalizeNoteText(candidate.createdAt || candidate.createdOn),
          }
        : null;

      if (
        noteObject &&
        (noteObject.content.includes(reviewNoteContent) ||
          noteObject.content.toLowerCase().includes('reviewed'))
      ) {
        return notes;
      }

      return noteObject
        ? [noteObject, { content: reviewNoteContent, createdAt: new Date().toISOString() }]
        : reviewNoteContent;
    }

    if (!normalized) {
      return reviewNoteContent;
    }

    if (normalized.includes(reviewNoteContent) || normalized.toLowerCase().includes('reviewed')) {
      return normalized;
    }

    return `${normalized}، ${reviewNoteContent}`;
  }

  // ============================================================
  // normalizeNoteText (private)
  // ============================================================
  private normalizeNoteText(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    const text = value.trim();
    return text && !this.isFrameworkTypeValue(text) ? text : '';
  }

  // ============================================================
  // normalizeNotesValue (private)
  // ============================================================
  private normalizeNotesValue(notes: unknown): string {
    if (Array.isArray(notes)) {
      return notes
        .map((note) => this.extractNoteContent(note))
        .filter((note): note is string => Boolean(note))
        .join(', ');
    }

    if (typeof notes === 'string') {
      const value = notes.trim();

      if (!value || this.isFrameworkTypeValue(value)) {
        return '';
      }

      return value;
    }

    if (notes && typeof notes === 'object') {
      return this.extractNoteContent(notes);
    }

    return '';
  }

  // ============================================================
  // extractNoteContent (private)
  // ============================================================
  private extractNoteContent(note: unknown): string {
    if (typeof note === 'string') {
      const value = note.trim();
      return value && !this.isFrameworkTypeValue(value) ? value : '';
    }

    if (note && typeof note === 'object') {
      const candidate = note as {
        text?: string;
        note?: string;
        content?: string;
        description?: string;
        value?: string;
        name?: string;
      };

      const text =
        candidate.text ||
        candidate.note ||
        candidate.content ||
        candidate.description ||
        candidate.value ||
        candidate.name;
      if (typeof text === 'string' && text.trim() && !this.isFrameworkTypeValue(text)) {
        return text.trim();
      }
    }

    return '';
  }

  // ============================================================
  // isFrameworkTypeValue (private) --- guards against leaked .NET type strings (e.g. "System.Collections.Generic.HashSet`1[...]")
  // ============================================================
  private isFrameworkTypeValue(value: string): boolean {
    return /(System\.Collections\.Generic\.(HashSet|List)|HashSet`|ICollection|IEnumerable)/i.test(
      value,
    );
  }
}
