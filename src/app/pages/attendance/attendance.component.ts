import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { read, utils, WorkBook, WorkSheet } from 'xlsx';
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
  imports: [CommonModule],
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

  private readonly emptyAttendanceMarker = '-';

  constructor(private attendanceService: AttendanceService) {}

  onAttendanceSheetSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.readAttendanceFile(file);

    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
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
      time === this.emptyAttendanceMarker ||
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
      return {
        date: this.normalizeExcelDate(isoMatch[1]),
        time: this.normalizeExcelTime(isoMatch[2])
      };
    }

    const normalMatch = text.match(
      /^(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)$/i
    );

    if (normalMatch) {
      return {
        date: this.normalizeExcelDate(normalMatch[1]),
        time: this.normalizeExcelTime(normalMatch[2])
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
      next: (response) => {
        console.log('Bulk Attendance Response:', response);

        this.hasImportedCurrentSheet = true;
        this.isImporting = false;
        this.successMessage =
          `تم حفظ ${this.attendanceRows.length} سجل حضور في السيستم بنجاح`;
      },
      error: (err) => {
        console.log('Bulk attendance error:', err);

        this.isImporting = false;
        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'حدث خطأ أثناء حفظ بيانات الحضور في السيستم';
      }
    });
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

  private hasAnyCellKey(row: any, possibleKeys: string[]): boolean {
    const rowKeys = Object.keys(row);

    return possibleKeys.some((key) =>
      rowKeys.some(
        (rowKey) => this.normalizeArabicText(rowKey) === this.normalizeArabicText(key)
      )
    );
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

private normalizeExcelTime(value: any): string {
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

  private isValidAttendanceTimeOrEmpty(value: string): boolean {
    return value === this.emptyAttendanceMarker || this.isValidTimeString(value);
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

  private isHeaderLikeRow(row: any): boolean {
    const values = Object.values(row)
      .map((value) => this.normalizeArabicText(String(value || '')))
      .join(' ');

    return (
      values.includes('كود الموظف') ||
      values.includes('employee') ||
      values.includes('user id') ||
      values.includes('date') ||
      values.includes('time')
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
}