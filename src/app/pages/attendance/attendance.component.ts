import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { read, utils, WorkBook, WorkSheet } from 'xlsx';
import { OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AttendancePayload,
  AttendanceService
} from '../../services/attendance.service';

interface FingerprintPunch {
  employeeCode: string;
  date: string;
  time: string;
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css'
})
export class AttendanceComponent {
  attendanceRows: AttendancePayload[] = [];

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
  isLoadingLateSummary = false;
  lateSummaryErrorMessage = '';
  lateSummarySuccessMessage = '';

  private lateSummarySearchTimer: any = null;

  departmentOptions: { id: number; name: string }[] = [
    { id: 1, name: 'إدارة الأزمات' },
    { id: 2, name: 'الاتصال السياسي' },
    { id: 3, name: 'الإدارة العامة للتنمية' },
    { id: 4, name: 'الاستثمار' },
    { id: 5, name: 'الإسكان' },
    { id: 6, name: 'الإعلانات' },
    { id: 7, name: 'الأمن' },
    { id: 8, name: 'الأمومة والطفولة' },
    { id: 9, name: 'التخطيط العمراني' },
    { id: 10, name: 'التخطيط والمتابعة' },
    { id: 11, name: 'التنمية الحضارية' },
    { id: 12, name: 'التوريدات' },
    { id: 13, name: 'الحجز الإداري' },
    { id: 14, name: 'الحسابات' },
    { id: 15, name: 'الحوكمة' },
    { id: 16, name: 'الخزينة' },
    { id: 17, name: 'الرصد الإعلامي' },
    { id: 18, name: 'السياحة' },
    { id: 19, name: 'الشؤون الإدارية' },
    { id: 20, name: 'الشؤون المالية' },
    { id: 21, name: 'الشؤون القانونية' },
    { id: 22, name: 'الصندوق التأميني' },
    { id: 23, name: 'العلاقات الدولية' },
    { id: 24, name: 'العلاقات العامة' },
    { id: 25, name: 'المتغيرات المكانية' },
    { id: 26, name: 'المخازن' },
    { id: 27, name: 'المركبات' },
    { id: 28, name: 'المكتب الفني' },
    { id: 29, name: 'الموارد البشرية' },
    { id: 30, name: 'الهيئة الموازنية' },
    { id: 31, name: 'ترشيد الطاقة' },
    { id: 32, name: 'حساب الخدمات' },
    { id: 33, name: 'خدمة المواطنين' },
    { id: 34, name: 'شؤون المجالس' },
    { id: 35, name: 'شؤون المقر' },
    { id: 36, name: 'صندوق الخدمات' },
    { id: 37, name: 'فض المنازعات' },
    { id: 38, name: 'مكتب الإعلام' },
    { id: 39, name: 'مكتب المستشار القضائي' },
    { id: 40, name: 'مكتب مفوض الدولة' }
  ];

statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'كل الحالات' },
  { value: 'Present', label: 'حاضر' },
  { value: 'Absent', label: 'غائب' },
  { value: 'Late', label: 'متأخر' },
  { value: 'EarlyDeparture', label: 'ترك عمل' }
];

private setDateRangeFromDates(from: Date, to: Date): void {
  this.dateRangeFrom = this.formatDateToApi(from);
  this.dateRangeTo = this.formatDateToApi(to);

  this.dateRangeFromDisplay = this.formatDateToDisplay(from);
  this.dateRangeToDisplay = this.formatDateToDisplay(to);
}
private getApiErrorMessage(err: any): string {
  const errors = err?.error?.errors;

  if (errors && typeof errors === 'object') {
    const messages = Object.keys(errors)
      .map((key) => `${key}: ${errors[key].join(' - ')}`)
      .join(' | ');

    return this.translateApiMessage(messages, 'حدث خطأ في التحقق من البيانات');
  }

  return this.translateApiMessage(
    err?.error?.message ||
    err?.error?.title ||
    err?.message ||
    'حدث خطأ أثناء الحفظ',
    'حدث خطأ أثناء الحفظ'
  );
}

private translateApiMessage(message: string | null | undefined, fallback: string = ''): string {
  const raw = String(message || '').trim();

  if (!raw) {
    return fallback;
  }

  const replacements: Array<[string, string]> = [
    [
      'checkout completed from next day import - please verify',
      'تم إكمال الخروج من استيراد اليوم التالي - يرجى التحقق'
    ],
    [
      'checkout completed from next day import',
      'تم إكمال الخروج من استيراد اليوم التالي'
    ],
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
    ['without', 'بدون'],
    ['check in without check out', 'دخول بدون خروج'],
    ['check out without check in', 'خروج بدون دخول']
  ];

  let translated = raw;

  replacements.forEach(([source, target]) => {
    translated = translated.replace(new RegExp(source, 'gi'), target);
  });

  return translated;
}

onDateRangeInputChange(value: string, field: 'from' | 'to'): void {
  const apiDate = value || '';

  if (field === 'from') {
    this.dateRangeFrom = apiDate;
    this.dateRangeFromDisplay = this.apiDateToDisplay(apiDate);
    return;
  }

  this.dateRangeTo = apiDate;
  this.dateRangeToDisplay = this.apiDateToDisplay(apiDate);
}
openNativeDatePicker(input: HTMLInputElement): void {
  if ((input as any).showPicker) {
    (input as any).showPicker();
    return;
  }

  input.click();
}
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

onLateSummaryDateInputChange(value: string, field: 'from' | 'to'): void {
  const apiDate = value || '';

  if (field === 'from') {
    this.lateSummaryFrom = apiDate;
    this.lateSummaryFromDisplay = this.apiDateToDisplay(apiDate);
    return;
  }

  this.lateSummaryTo = apiDate;
  this.lateSummaryToDisplay = this.apiDateToDisplay(apiDate);
}

formatDateDisplayWhileTyping(field: 'from' | 'to'): void {
  let value =
    field === 'from'
      ? this.dateRangeFromDisplay
      : this.dateRangeToDisplay;

  value = String(value || '').replace(/\D/g, '').slice(0, 8);

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

private formatDateToApi(date: Date): string {
  const year = date.getFullYear();
  const month = this.pad(date.getMonth() + 1);
  const day = this.pad(date.getDate());

  return `${year}-${month}-${day}`;
}

private formatDateToDisplay(date: Date): string {
  const day = this.pad(date.getDate());
  const month = this.pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}
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

displayDateToNative(displayDate: string): string {
  return this.displayDateToApi(displayDate);
}

private apiDateToDisplay(apiDate: string): string {
  if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) {
    return '';
  }

  const [year, month, day] = apiDate.split('-');

  return `${day}/${month}/${year}`;
}

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
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValidDate) {
    return '';
  }

  return `${year}-${this.pad(month)}-${this.pad(day)}`;
}
 constructor(private attendanceService: AttendanceService) {}

 openAttendancePage(page: 'import' | 'report' | 'lateSummary' | 'edit'): void {
  this.activeAttendancePage = page;

  if (
    page === 'lateSummary' &&
    !this.lateSummaryFromDisplay &&
    !this.lateSummaryToDisplay
  ) {
    this.setTodayLateSummaryDateRange();
  }
}

  onAttendanceSheetSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.readAttendanceFile(file);

    input.value = '';
  }
  setTodayLateSummaryDateRange(): void {
  const today = new Date();
  this.setLateSummaryDateRangeFromDates(today, today);
}

setYesterdayLateSummaryDateRange(): void {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  this.setLateSummaryDateRangeFromDates(yesterday, yesterday);
}

setCurrentMonthLateSummaryDateRange(): void {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  this.setLateSummaryDateRangeFromDates(firstDay, today);
}

private setLateSummaryDateRangeFromDates(from: Date, to: Date): void {
  this.lateSummaryFrom = this.formatLateDateToApi(from);
  this.lateSummaryTo = this.formatLateDateToApi(to);

  this.lateSummaryFromDisplay = this.formatLateDateToDisplay(from);
  this.lateSummaryToDisplay = this.formatLateDateToDisplay(to);
}

formatLateDateDisplayWhileTyping(field: 'from' | 'to'): void {
  let value =
    field === 'from'
      ? this.lateSummaryFromDisplay
      : this.lateSummaryToDisplay;

  value = String(value || '').replace(/\D/g, '').slice(0, 8);

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

private formatLateDateToApi(date: Date): string {
  const year = date.getFullYear();
  const month = this.pad(date.getMonth() + 1);
  const day = this.pad(date.getDate());

  return `${year}-${month}-${day}`;
}

private formatLateDateToDisplay(date: Date): string {
  const day = this.pad(date.getDate());
  const month = this.pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

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
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValidDate) {
    return '';
  }

  return `${year}-${this.pad(month)}-${this.pad(day)}`;
}

private lateApiDateToDisplay(apiDate: string): string {
  if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) {
    return '';
  }

  const [year, month, day] = apiDate.split('-');

  return `${day}/${month}/${year}`;
}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }
  ngOnInit(): void {
  this.setTodayDateRange();
}

setTodayDateRange(): void {
  const today = new Date();
  const formattedDate = this.formatDateForInput(today);

  this.dateRangeFrom = formattedDate;
  this.dateRangeTo = formattedDate;
}

setYesterdayDateRange(): void {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const formattedDate = this.formatDateForInput(yesterday);

  this.dateRangeFrom = formattedDate;
  this.dateRangeTo = formattedDate;
}


setCurrentMonthDateRange(): void {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  this.dateRangeFrom = this.formatDateForInput(firstDay);
  this.dateRangeTo = this.formatDateForInput(today);
}

private formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = this.pad(date.getMonth() + 1);
  const day = this.pad(date.getDate());

  return `${year}-${month}-${day}`;
}

get filteredDateRangeRows(): any[] {
  const search = this.normalizeArabicText(this.employeeSearchTerm);

  if (!search) {
    return this.dateRangeRows;
  }

  return this.dateRangeRows.filter((row: any) => {
    const employeeCode = this.normalizeArabicText(
      row.employeeCode ||
      row.employee?.employeeCode ||
      row.employee?.code ||
      ''
    );

    const employeeName = this.normalizeArabicText(
      row.employeeName ||
      row.name ||
      row.employee?.name ||
      row.employee?.employeeName ||
      ''
    );

    const departmentName = this.normalizeArabicText(
      row.departmentName ||
      row.employee?.departmentName ||
      row.department?.name ||
      ''
    );

    return (
      employeeCode.includes(search) ||
      employeeName.includes(search) ||
      departmentName.includes(search)
    );
  });
}
  getAttendanceId(row: any): number | null {
  const id = row?.id || row?.attendanceId || row?.attendanceRecordId;

  if (!id) {
    return null;
  }

  const numberId = Number(id);

  return Number.isFinite(numberId) && numberId > 0 ? numberId : null;
}

isReviewed(row: any): boolean {
  const notes = String(row?.notes || '').trim().toLowerCase();

  return (
    notes.includes('تمت المراجعة') ||
    notes.includes('تمت مراجعه') ||
    notes.includes('reviewed')
  );
}

needsReview(row: any): boolean {
  if (this.isReviewed(row)) {
    return false;
  }

  const notes = String(row?.notes || '').trim().toLowerCase();
  const status = String(row?.status || '').trim();

  return (
    notes.includes('needs review') ||
    notes.includes('يحتاج مراجعة') ||
    notes.includes('يحتاج مراجعه') ||
    notes.includes('checkin without checkout') ||
    notes.includes('checkout without checkin') ||
    status === 'Incomplete' ||
    status === 'MissingIn' ||
    status === 'MissingOut'
  );
}

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
    notes: 'تمت المراجعة'
  };

  this.attendanceService.updateAttendanceStatus(attendanceId, payload).subscribe({
    next: (response: any) => {
      console.log('Mark Attendance Reviewed Response:', response);

      if (response?.isSuccess === false) {
        this.dateRangeErrorMessage = this.translateApiMessage(
          response?.message,
          'فشل اعتماد مراجعة سجل الحضور'
        );
        this.reviewingAttendanceId = null;
        return;
      }

      row.notes = 'تمت المراجعة';
      row.isReviewed = true;

      this.dateRangeSuccessMessage = 'تم اعتماد مراجعة السجل بنجاح';
      this.reviewingAttendanceId = null;
    },
    error: (err) => {
      console.log('Mark attendance reviewed error:', err);

this.dateRangeErrorMessage = this.translateApiMessage(
          err?.error?.message || err?.message || 'حدث خطأ أثناء اعتماد مراجعة سجل الحضور',
          'حدث خطأ أثناء اعتماد مراجعة سجل الحضور'
        );

      this.reviewingAttendanceId = null;
    }
  });
}

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer?.files?.[0];

    if (!file) {
      return;
    }

    this.readAttendanceFile(file);
  }

  private async readAttendanceFile(file: File): Promise<void> {
    this.excelFileName = file.name;
    this.attendanceRows = [];
    this.successMessage = '';
    this.errorMessage = '';
    this.rowErrors = [];
    this.isImporting = false;
    this.hasImportedCurrentSheet = false;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'xlsx' && extension !== 'xls' && extension !== 'csv') {
      this.errorMessage =
        'من فضلك ارفعي ملف Excel أو CSV بصيغة xlsx أو xls أو csv فقط';
      return;
    }

    try {
      let workbook: WorkBook;

      if (extension === 'csv') {
        const csvText = await file.text();

        workbook = read(csvText, {
          type: 'string',
          cellDates: true
        });
      } else {
        const arrayBuffer = await file.arrayBuffer();

        workbook = read(arrayBuffer, {
          type: 'array',
          cellDates: true
        });
      }

      if (!workbook.SheetNames.length) {
        this.errorMessage = 'الملف لا يحتوي على Sheets أو بيانات';
        return;
      }

      const attendanceMap = new Map<string, AttendancePayload>();
      const fingerprintPunches: FingerprintPunch[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet: WorkSheet = workbook.Sheets[sheetName];

        const rows = utils.sheet_to_json(worksheet, {
          defval: '',
          raw: true
        }) as any[];

        rows.forEach((row, index) => {
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
              `Sheet ${sheetName} - صف رقم ${index + 2}: بيانات ناقصة أو غير صحيحة: ${missing.join(' - ')} - ${JSON.stringify(row)}`
            );

            return;
          }

          const punch = this.mapFingerprintPunchRow(row, sheetName);

          if (punch) {
            fingerprintPunches.push(punch);
            return;
          }

          this.rowErrors.push(
            `Sheet ${sheetName} - صف رقم ${index + 2}: لا يمكن قراءة الصف - ${JSON.stringify(row)}`
          );
        });
      });

      const groupedPunches = this.convertPunchesToAttendance(fingerprintPunches);

      groupedPunches.forEach((attendance) => {
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

      this.successMessage =
        `تم استخراج ${this.attendanceRows.length} سجل حضور من الملف`;

      console.log('Attendance JSON:', this.attendanceRows);
      console.log('Attendance Row Errors:', this.rowErrors);
      console.table(this.rowErrors.slice(0, 30));

      this.importAttendance();
    } catch (error) {
      console.log(error);
      this.errorMessage = 'حدث خطأ أثناء قراءة ملف الحضور';
    }
  }

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
        'No.'
      ])
    ).trim();

    const dateRaw =
      this.getCellValue(row, [
        'التاريخ',
        'date',
        'Date',
        'attendanceDate',
        'Attendance Date'
      ]) || sheetName;

    const actualInRaw = this.getCellValue(row, [
      'وقت الحضور',
      'الحضور',
      'actualIn',
      'ActualIn',
      'Actual In',
      'Check In',
      'In',
      'Clock In'
    ]);

    const actualOutRaw = this.getCellValue(row, [
      'وقت الانصراف',
      'الانصراف',
      'actualOut',
      'ActualOut',
      'Actual Out',
      'Check Out',
      'Out',
      'Clock Out'
    ]);

    if (!employeeCode) {
      return null;
    }

    return {
      employeeCode,
      date: this.normalizeExcelDate(dateRaw),
      actualIn: this.normalizeExcelTime(actualInRaw),
      actualOut: this.normalizeExcelTime(actualOutRaw)
    };
  }

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
        'No.'
      ])
    ).trim();

    const dateRaw =
      this.getCellValue(row, [
        'التاريخ',
        'date',
        'Date',
        'attendanceDate',
        'Attendance Date'
      ]) || sheetName;

    const timeRaw = this.getCellValue(row, [
      'وقت البصمة',
      'وقت',
      'time',
      'Time',
      'Punch Time',
      'PunchTime',
      'Verify Time',
      'VerifyTime',
      'Transaction Time'
    ]);

    const dateTimeRaw = this.getCellValue(row, [
      'DateTime',
      'Date Time',
      'Punch DateTime',
      'Verify Time',
      'Transaction Time',
      'التاريخ والوقت',
      'تاريخ ووقت'
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
          time: parsed.time
        };
      }
    }

    const date = this.normalizeExcelDate(dateRaw);
    const time = this.normalizeExcelTime(timeRaw);

    if (
      !date ||
      !time ||
      !this.isValidDateString(date) ||
      !this.isValidTimeString(time)
    ) {
      return null;
    }

    return {
      employeeCode,
      date,
      time
    };
  }

  private convertPunchesToAttendance(punches: FingerprintPunch[]): AttendancePayload[] {
    const grouped = new Map<string, FingerprintPunch[]>();

    punches.forEach((punch) => {
      const key = `${punch.employeeCode}_${punch.date}`;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      grouped.get(key)?.push(punch);
    });

    const attendanceRows: AttendancePayload[] = [];

    grouped.forEach((items) => {
      const sorted = [...items].sort(
        (a, b) => this.timeToSeconds(a.time) - this.timeToSeconds(b.time)
      );

      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      attendanceRows.push({
        employeeCode: first.employeeCode,
        date: first.date,
        actualIn: first.time,
        actualOut: last.time
      });
    });

    return attendanceRows;
  }

  private splitDateTime(value: any): { date: string; time: string } {
    if (!value) {
      return { date: '', time: '' };
    }

    if (value instanceof Date) {
      return {
        date: this.formatDate(value),
        time: `${this.pad(value.getHours())}:${this.pad(value.getMinutes())}:${this.pad(value.getSeconds())}`
      };
    }

    const text = String(value).trim();

    const isoMatch = text.match(
      /^(\d{4}[-/]\d{1,2}[-/]\d{1,2})[ T]+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)$/i
    );

    if (isoMatch) {
      const normalizedTime = this.normalizeExcelTime(isoMatch[2]);

      return {
        date: this.normalizeExcelDate(isoMatch[1]),
        time: normalizedTime || ''
      };
    }

    const normalMatch = text.match(
      /^(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)$/i
    );

    if (normalMatch) {
      const normalizedTime = this.normalizeExcelTime(normalMatch[2]);

      return {
        date: this.normalizeExcelDate(normalMatch[1]),
        time: normalizedTime || ''
      };
    }

    return { date: '', time: '' };
  }

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
        !this.isValidAttendanceTimeOrEmpty(row.actualOut)
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

        const successRows = importResults.filter((item: any) =>
          String(item?.status || '').toLowerCase() === 'success'
        );

        const skippedRows = importResults.filter((item: any) =>
          String(item?.status || '').toLowerCase() === 'skipped'
        );

        const failedRows = importResults.filter((item: any) =>
          String(item?.status || '').toLowerCase() === 'failed'
        );

        console.log('Success rows:', successRows.length);
        console.table(successRows);

        console.log('Skipped rows:', skippedRows.length);
        console.table(skippedRows.slice(0, 30));

        console.log('Failed rows:', failedRows.length);
        console.table(failedRows);

        this.successMessage =
          `تم الاستيراد: ${successCount} سجل اتحفظ، ${skippedCount} تم تخطيه، ${failedCount} فشل.`;

        if (failedCount > 0) {
          this.errorMessage =
            `فشل حفظ ${failedCount} سجل حضور. راجعي Failed rows في Console لمعرفة السبب.`;
        }
      },
      error: (err) => {
        console.log('Bulk attendance error:', err);

        this.isImporting = false;
        this.errorMessage = this.translateApiMessage(
          err?.error?.message || err?.message || 'حدث خطأ أثناء حفظ بيانات الحضور في السيستم',
          'حدث خطأ أثناء حفظ بيانات الحضور في السيستم'
        );
      }
    });
  }

  loadAttendanceByDateRange(): void {
    if (!this.dateRangeFrom || !this.dateRangeTo) {
      this.dateRangeErrorMessage = 'من فضلك اختاري تاريخ البداية والنهاية';
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
        this.employeeSearchTerm || null
      )
      .subscribe({
        next: (response: any) => {
          console.log('Attendance Date Range Response:', response);

          const data = response?.data || response;

          if (Array.isArray(data?.items)) {
            this.dateRangeRows = this.prepareDateRangeRows(data.items);

            this.dateRangePageNumber = data.pageNumber || 1;
            this.dateRangePageSize = data.pageSize || this.dateRangePageSize;
            this.dateRangeTotalCount = data.totalCount || 0;
            this.dateRangeTotalPages = data.totalPages || 0;
          } else if (Array.isArray(data)) {
            this.dateRangeRows = this.prepareDateRangeRows(data);

            this.dateRangeTotalCount = data.length;
            this.dateRangeTotalPages = 1;
          } else {
            this.dateRangeRows = [];
            this.dateRangeTotalCount = 0;
            this.dateRangeTotalPages = 0;
          }

          this.dateRangeSuccessMessage =
            `تم تحميل ${this.dateRangeTotalCount || this.dateRangeRows.length} سجل حضور`;

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
            'حدث خطأ أثناء تحميل سجلات الحضور'
          );

          this.isLoadingDateRange = false;
        }
      });
  }

  applyDateRangeFilter(): void {
  const fromApiDate = this.displayDateToApi(this.dateRangeFromDisplay);
  const toApiDate = this.displayDateToApi(this.dateRangeToDisplay);

  if (!fromApiDate || !toApiDate) {
    this.dateRangeErrorMessage =
      'من فضلك اكتبي التاريخ بطريقة صحيحة مثل: 31/03/2026';
    return;
  }

  this.dateRangeFrom = fromApiDate;
  this.dateRangeTo = toApiDate;

  this.dateRangeFromDisplay = this.apiDateToDisplay(fromApiDate);
  this.dateRangeToDisplay = this.apiDateToDisplay(toApiDate);

  this.dateRangePageNumber = 1;
  if (this.employeeSearchTerm && String(this.employeeSearchTerm).trim() !== '') {
    this.searchEmployee();
  } else {
    this.loadAttendanceByDateRange();
  }
}

  async searchEmployee(): Promise<void> {
    if (!this.dateRangeFrom || !this.dateRangeTo) {
      this.dateRangeErrorMessage = 'من فضلك اختاري تاريخ البداية والنهاية';
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
            this.employeeSearchTerm || null
          )
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
            row.employeeName || row.name || row.employee?.name || ''
          );

          const employeeCode = this.normalizeArabicText(
            row.employeeCode || row.employee?.employeeCode || ''
          );

          return (
            employeeName.includes(searchNorm) || employeeCode.includes(searchNorm)
          );
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

  clearDateRangeFilter(): void {
    this.dateRangeFrom = '';
    this.dateRangeTo = '';
    this.dateRangeDepartmentId = null;
    this.dateRangeStatus = '';
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

  nextDateRangePage(): void {
    if (this.dateRangePageNumber < this.dateRangeTotalPages) {
      this.dateRangePageNumber++;
      this.loadAttendanceByDateRange();
    }
  }

  previousDateRangePage(): void {
    if (this.dateRangePageNumber > 1) {
      this.dateRangePageNumber--;
      this.loadAttendanceByDateRange();
    }
  }

  private prepareDateRangeRows(rows: any[]): any[] {
    return rows.map((row: any) => ({
      ...row
    }));
  }

  openAttendanceEdit(row: any): void {
    const attendanceId = row.id || row.attendanceId;

    if (!attendanceId) {
      this.dateRangeErrorMessage =
        'لا يمكن تعديل هذا السجل لأن رقم سجل الحضور غير موجود';
      return;
    }

    this.selectedAttendanceForEdit = row;

    this.attendanceEditId = attendanceId;
    this.attendanceEditEmployeeCode =
      row.employeeCode || row.employee?.employeeCode || '';

    this.attendanceEditEmployeeName =
      row.employeeName || row.name || row.employee?.name || '';

    this.attendanceEditDepartmentName =
      row.departmentName || row.employee?.departmentName || '';

    this.attendanceEditDate =
      row.date || row.attendanceDate || '';

    this.attendanceEditActualIn = this.timeForInput(row.actualIn);
    this.attendanceEditActualOut = this.timeForInput(row.actualOut);

    this.attendanceEditStatus = row.status || '';
    this.attendanceEditNotes = row.notes || '';

    this.attendanceEditErrorMessage = '';
    this.attendanceEditSuccessMessage = '';

    this.activeAttendancePage = 'edit';
  }

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

saveAttendanceEdit(): void {
  if (!this.attendanceEditId) {
    this.attendanceEditErrorMessage = 'رقم سجل الحضور غير موجود';
    return;
  }

  const actualIn = this.normalizeTimeForApi(this.attendanceEditActualIn);
  const actualOut = this.normalizeTimeForApi(this.attendanceEditActualOut);
  const notes = String(this.attendanceEditNotes || '').trim();

  let finalStatus = String(this.attendanceEditStatus || '').trim();

  if (
    actualIn &&
    actualOut &&
    (
      finalStatus === '' ||
      finalStatus === 'Absent' ||
      finalStatus === 'غائب' ||
      finalStatus === 'MissingIn' ||
      finalStatus === 'MissingOut' ||
      finalStatus === 'Incomplete'
    )
  ) {
    finalStatus = 'Present';
  }

  if (!finalStatus) {
    this.attendanceEditErrorMessage =
      'من فضلك اختاري الحالة أو أدخلي وقت الحضور والانصراف';
    return;
  }

  const timePayload = {
    actualIn,
    actualOut,
    notes
  };

  const statusPayload = {
    status: finalStatus,
    notes
  };

  console.log('Attendance Edit ID:', this.attendanceEditId);
  console.log('Time Payload:', timePayload);
  console.log('Status Payload:', statusPayload);

  this.isSavingAttendanceEdit = true;
  this.attendanceEditErrorMessage = '';
  this.attendanceEditSuccessMessage = '';

  this.attendanceService.updateAttendanceTime(this.attendanceEditId, timePayload).subscribe({
    next: (timeResponse: any) => {
      console.log('Update Attendance Time Response:', timeResponse);

      if (timeResponse?.isSuccess === false) {
        this.attendanceEditErrorMessage =
          timeResponse?.message || 'فشل تعديل وقت الحضور والانصراف';
        this.isSavingAttendanceEdit = false;
        return;
      }

      this.attendanceService.updateAttendanceStatus(this.attendanceEditId!, statusPayload).subscribe({
        next: (statusResponse: any) => {
          console.log('Update Attendance Status Response:', statusResponse);

          if (statusResponse?.isSuccess === false) {
            this.attendanceEditErrorMessage =
              statusResponse?.message || 'تم تعديل الوقت ولكن فشل تعديل الحالة';
            this.isSavingAttendanceEdit = false;
            return;
          }

          this.attendanceEditStatus = finalStatus;
          this.attendanceEditSuccessMessage =
            'تم تعديل وقت وحالة سجل الحضور بنجاح';

          this.isSavingAttendanceEdit = false;

          this.activeAttendancePage = 'report';
          this.loadAttendanceByDateRange();
        },
        error: (err: any) => {
          console.log('Update attendance status error:', err);

          this.attendanceEditErrorMessage = this.getApiErrorMessage(err);
          this.isSavingAttendanceEdit = false;
        }
      });
    },
    error: (err: any) => {
      console.log('Update attendance time error:', err);

      this.attendanceEditErrorMessage = this.getApiErrorMessage(err);
      this.isSavingAttendanceEdit = false;
    }
  });
}
  

 resolveAttendanceStatusAfterTimeEdit(
  currentStatus: string | null | undefined,
  actualIn: string | null,
  actualOut: string | null
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
    'بيانات ناقصة'
  ];

  if (absentStatuses.includes(status)) {
    return 'Present';
  }

  // لو المستخدم مختار Late أو EarlyDeparture سيبيها زي ما هي
  return status;
}

onLateSummarySearchInput(): void {
  if (this.lateSummarySearchTimer) {
    clearTimeout(this.lateSummarySearchTimer);
  }

  this.lateSummarySearchTimer = setTimeout(() => {
    this.loadLateSummary();
  }, 300);
}

loadLateSummary(): void {
  const fromApiDate = this.displayDateToApi(this.lateSummaryFromDisplay);
  const toApiDate = this.displayDateToApi(this.lateSummaryToDisplay);

  if (!fromApiDate || !toApiDate) {
    this.lateSummaryErrorMessage =
      'من فضلك اكتبي التاريخ بطريقة صحيحة مثل: 31/03/2026';
    return;
  }

  this.isLoadingLateSummary = true;
  this.lateSummaryErrorMessage = '';
  this.lateSummarySuccessMessage = '';

  this.lateSummaryFrom = fromApiDate;
  this.lateSummaryTo = toApiDate;
  this.lateSummaryFromDisplay = this.apiDateToDisplay(fromApiDate);
  this.lateSummaryToDisplay = this.apiDateToDisplay(toApiDate);

  this.attendanceService
    .getLateSummary(
      this.lateSummaryFrom,
      this.lateSummaryTo,
      this.lateSummaryEmployeeSearch || null,
      this.lateSummaryDepartmentId
    )
    .subscribe({
      next: (response: any) => {
        this.isLoadingLateSummary = false;

        const data = response?.data ?? response;
        this.lateSummaryData = Array.isArray(data) ? data : data ? [data] : [];
        this.lateSummaryRows = Array.isArray(this.lateSummaryData)
          ? this.lateSummaryData
          : [];

        this.lateSummarySuccessMessage =
          response?.message || 'تم عرض ملخص التأخير بنجاح';
      },
      error: (err: any) => {
        this.isLoadingLateSummary = false;

        this.lateSummaryErrorMessage = this.translateApiMessage(
          err?.error?.message || err?.message || 'حدث خطأ أثناء جلب ملخص التأخير',
          'حدث خطأ أثناء جلب ملخص التأخير'
        );

        this.lateSummaryData = null;
        this.lateSummaryRows = [];
      }
    });
}

  clearLateSummary(): void {
  this.lateSummaryFrom = '';
  this.lateSummaryTo = '';
  this.lateSummaryFromDisplay = '';
  this.lateSummaryToDisplay = '';

  this.lateSummaryEmployeeId = null;
  this.lateSummaryEmployeeSearch = '';
  this.lateSummarySelectedEmployee = null;
  this.lateSummaryDepartmentId = null;

  this.lateSummaryData = null;
  this.lateSummaryRows = [];
  this.lateSummaryErrorMessage = '';
  this.lateSummarySuccessMessage = '';
}

  clearData(): void {
    this.attendanceRows = [];
    this.excelFileName = '';
    this.successMessage = '';
    this.errorMessage = '';
    this.rowErrors = [];
    this.isImporting = false;
    this.hasImportedCurrentSheet = false;
  }

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

  timeForInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const text = String(value).trim();
    const match = text.match(/^(\d{2}):(\d{2})/);

    if (!match) {
      return '';
    }

    return `${match[1]}:${match[2]}`;
  }

  private getCellValue(row: any, possibleKeys: string[]): any {
    const rowKeys = Object.keys(row);

    for (const key of possibleKeys) {
      const matchedKey = rowKeys.find(
        (rowKey) => this.normalizeArabicText(rowKey) === this.normalizeArabicText(key)
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

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());

    return `${year}-${month}-${day}`;
  }

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

  private timeToSeconds(value: string): number {
    if (!this.isValidTimeString(value)) {
      return 0;
    }

    const [hours, minutes, seconds] = value.split(':').map(Number);

    return hours * 3600 + minutes * 60 + seconds;
  }

  private isValidAttendanceTimeOrEmpty(value: string | null): boolean {
    return value === null || this.isValidTimeString(value);
  }

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
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59 &&
      seconds >= 0 &&
      seconds <= 59
    );
  }

  private isValidDateString(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private secondsToTime(totalSeconds: number): string {
    const normalized = ((totalSeconds % 86400) + 86400) % 86400;

    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    const seconds = normalized % 60;

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private isEmptyRow(row: any): boolean {
    return Object.values(row).every(
      (value) =>
        value === null ||
        value === undefined ||
        String(value).trim() === ''
    );
  }

  private normalizeArabicText(value: string): string {
    return String(value || '')
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[ًٌٍَُِّْ]/g, '')
      .replace(/[ـ]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  formatMinutesToHoursLabel(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const minutes = Number(value);

    if (Number.isNaN(minutes)) {
      return '-';
    }

    const hours = minutes / 60;

    if (!Number.isFinite(hours)) {
      return '-';
    }

    const normalized = Number(hours.toFixed(2));

    if (normalized % 1 === 0) {
      return `${normalized} ساعة`;
    }

    return `${normalized} ساعة`;
  }

  getStatusLabel(status: string | null | undefined): string {
    const value = String(status || '').trim();

    const statusMap: Record<string, string> = {
      Present: 'حاضر',
      Absent: 'غائب',
      Late: 'متأخر',
      EarlyDeparture: 'ترك عمل',
      Permission: 'إذن',
      Vacation: 'إجازة',
      Mission: 'مأمورية',
      Incomplete: 'بيانات ناقصة',
      MissingIn: 'حضور ناقص',
      MissingOut: 'انصراف ناقص'
    };

    return statusMap[value] || value || '-';
  }

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
        return 'status-permission';

      default:
        return 'status-default';
    }
  }

  getNotesLabel(notes: string | null | undefined): string {
    const value = String(notes || '').trim();

    if (!value || value === '-') {
      return '-';
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
      'Missing checkin': 'حضور ناقص',
      'Missing checkout': 'انصراف ناقص',
      'No checkin': 'لا يوجد حضور',
      'No checkout': 'لا يوجد انصراف',
      'Manual update': 'تعديل يدوي',
      'Approved manually': 'تم الاعتماد يدويًا'
    };

    return translated || notesMap[value] || value;
  }

}