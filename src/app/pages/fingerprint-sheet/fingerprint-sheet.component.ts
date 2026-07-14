import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { utils, writeFile } from 'xlsx';
import { AttendanceService } from '../../services/attendance.service';

interface RawPunchRecord {
  employeeCode?: string;
  employeeName?: string;
  date?: string;
  time?: string;
  punchTime?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-fingerprint-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fingerprint-sheet.component.html',
  styleUrl: './fingerprint-sheet.component.css'
})
export class FingerprintSheetComponent implements OnInit {
  fromDate = '';
  toDate = '';
  fromDateDisplay = '';
  toDateDisplay = '';

  employeeCode = '';

  pageNumber = 1;
  pageSize = 10;

  records: RawPunchRecord[] = [];
  isLoading = false;
  isExporting = false;
  errorMessage = '';
  totalCount = 0;
  totalPages = 0;

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.setTodayDateRange();
    this.loadData();
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  private setDateRangeFromDates(from: Date, to: Date): void {
    this.fromDate = this.formatDateToApi(from);
    this.toDate = this.formatDateToApi(to);
    this.fromDateDisplay = this.formatDateToDisplay(from);
    this.toDateDisplay = this.formatDateToDisplay(to);
  }

  setTodayDateRange(): void {
    const today = new Date();
    this.setDateRangeFromDates(today, today);
  }

  setYesterdayDateRange(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.setDateRangeFromDates(yesterday, yesterday);
  }

  setCurrentMonthDateRange(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.setDateRangeFromDates(firstDay, today);
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
    const apiDate = input.value;

    if (!apiDate) {
      return;
    }

    if (field === 'from') {
      this.fromDate = apiDate;
      this.fromDateDisplay = this.apiDateToDisplay(apiDate);
    } else {
      this.toDate = apiDate;
      this.toDateDisplay = this.apiDateToDisplay(apiDate);
    }
  }

  onDateInputChange(value: string, field: 'from' | 'to'): void {
    const apiDate = value ? this.displayDateToApi(value) : '';

    if (field === 'from') {
      this.fromDate = apiDate;
      this.fromDateDisplay = this.apiDateToDisplay(apiDate);
      return;
    }

    this.toDate = apiDate;
    this.toDateDisplay = this.apiDateToDisplay(apiDate);
  }

  formatDateDisplayWhileTyping(field: 'from' | 'to'): void {
    let value = field === 'from' ? this.fromDateDisplay : this.toDateDisplay;

    value = String(value || '').replace(/\D/g, '').slice(0, 8);

    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    if (field === 'from') {
      this.fromDateDisplay = value;
      this.onDateInputChange(value, 'from');
    } else {
      this.toDateDisplay = value;
      this.onDateInputChange(value, 'to');
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

  formatDisplayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }

    const raw = String(value).trim();

    if (!raw) {
      return '-';
    }

    const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return `${day}/${month}/${year}`;
    }

    const dateTimeMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:Z|([+-]\d{2}:\d{2}))?$/);
    if (dateTimeMatch) {
      const [, year, month, day, hour, minute, second] = dateTimeMatch;
      const timePart = second ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;
      return `${day}/${month}/${year} ${timePart}`;
    }

    const parsedDate = new Date(raw);
    if (!Number.isNaN(parsedDate.getTime())) {
      return `${this.pad(parsedDate.getDate())}/${this.pad(parsedDate.getMonth() + 1)}/${parsedDate.getFullYear()} ${this.pad(parsedDate.getHours())}:${this.pad(parsedDate.getMinutes())}`;
    }

    return raw;
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const from = this.fromDate;
    const to = this.toDate;

    this.attendanceService.getRawPunches(
      from,
      to,
      this.employeeCode.trim(),
      this.pageNumber,
      this.pageSize
    ).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        const items = Array.isArray(data) ? data : data?.items ?? [];

        this.records = items;
        this.totalCount = Number(data?.totalCount ?? data?.total ?? items.length ?? 0);
        this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'فشل تحميل شيت البصمة';
        this.isLoading = false;
      }
    });
  }

  exportToExcel(): void {
    if (!this.fromDate || !this.toDate) {
      this.errorMessage = 'يرجى اختيار نطاق التاريخ أولاً';
      return;
    }

    this.isExporting = true;
    this.errorMessage = '';

    const exportPageSize = 1000;
    const allRecords: RawPunchRecord[] = [];

    const fetchPage = (page: number): void => {
      this.attendanceService.getRawPunches(
        this.fromDate,
        this.toDate,
        this.employeeCode.trim(),
        page,
        exportPageSize
      ).subscribe({
        next: (response: any) => {
          const data = response?.data ?? response;
          const items = Array.isArray(data) ? data : data?.items ?? [];
          const totalCount = Number(data?.totalCount ?? data?.total ?? items.length ?? 0);
          allRecords.push(...items);

          const totalPages = Math.max(1, Math.ceil(totalCount / exportPageSize));

          if (page < totalPages) {
            fetchPage(page + 1);
            return;
          }

          this.downloadExcel(allRecords);
        },
        error: () => {
          this.errorMessage = 'فشل تصدير ملف Excel';
          this.isExporting = false;
        }
      });
    };

    fetchPage(1);
  }

  private downloadExcel(records: RawPunchRecord[]): void {
    const rows = records.map((item) => ({
      employeeName: this.formatDisplayValue(item.employeeName || 'غير محدد'),
      employeeCode: this.formatDisplayValue(item.employeeCode || '-'),
      departmentRaw: this.formatDisplayValue(item['departmentRaw'] || '-'),
      punchDate: this.formatDisplayValue(item['punchDate'] || item.date || '-'),
      inRaw: this.formatDisplayValue(item['inRaw'] || item.time || '-'),
      outRaw: this.formatDisplayValue(item['outRaw'] || item.punchTime || '-'),
      importedAt: this.formatDisplayValue(item['importedAt'] || '-')
    }));

    const worksheet = utils.json_to_sheet(rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'شيت البصمة');

    const fileName = `shiet-basma-${new Date().toISOString().slice(0, 10)}.xlsx`;
    writeFile(workbook, fileName);

    this.isExporting = false;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.pageNumber = page;
    this.loadData();
  }

  nextPage(): void {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadData();
    }
  }

  previousPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadData();
    }
  }
}
