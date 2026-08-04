import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { utils, writeFile } from 'xlsx';
import { FingerprintSheetService } from '../service/fingerprint-sheet.service';
import { RawPunchRecord } from '../model/models';

@Component({
  selector: 'app-fingerprint-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fingerprint-sheet.component.html',
  styleUrls: ['./fingerprint-sheet.component.css']
})
export class FingerprintSheetComponent implements OnInit {
  date = '';
  dateDisplay = '';

  searchTerm = '';

  pageNumber = 1;
  pageSize = 10;

  records: RawPunchRecord[] = [];
  isLoading = false;
  isExporting = false;
  errorMessage = '';
  totalCount = 0;
  totalPages = 0;

  constructor(private fingerprintSheetService: FingerprintSheetService) {}

  ngOnInit(): void {
    this.setTodayDate();
    this.loadData();
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  private setDate(d: Date): void {
    this.date = this.formatDateToApi(d);
    this.dateDisplay = this.formatDateToDisplay(d);
  }

  setTodayDate(): void {
    this.setDate(new Date());
  }

  setYesterdayDate(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.setDate(yesterday);
  }

  openNativeDatePicker(input: HTMLInputElement): void {
    if ((input as any).showPicker) {
      (input as any).showPicker();
      return;
    }

    input.click();
  }

  onNativeDatePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const apiDate = input.value;

    if (!apiDate) {
      return;
    }

    this.date = apiDate;
    this.dateDisplay = this.apiDateToDisplay(apiDate);
  }

  onDateInputChange(value: string): void {
    const apiDate = value ? this.displayDateToApi(value) : '';
    this.date = apiDate;
    this.dateDisplay = this.apiDateToDisplay(apiDate);
  }

  formatDateDisplayWhileTyping(): void {
    let value = this.dateDisplay;

    value = String(value || '').replace(/\D/g, '').slice(0, 8);

    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    this.dateDisplay = value;
    this.onDateInputChange(value);
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

    if (/^\d+$/.test(raw)) {
      return raw;
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

    return raw;
  }

  // ============================================================
  // بيفصل قيمة البحث الواحدة لـ كود أو اسم حسب المحتوى:
  // أرقام فقط -> كود الموظف، غير كده -> اسم الموظف
  // ============================================================
  private splitSearchTerm(): { employeeCode: string; employeeName: string } {
    const term = this.searchTerm.trim();

    if (!term) {
      return { employeeCode: '', employeeName: '' };
    }

    const isCodeOnly = /^\d+$/.test(term);

    return isCodeOnly
      ? { employeeCode: term, employeeName: '' }
      : { employeeCode: '', employeeName: term };
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const { employeeCode, employeeName } = this.splitSearchTerm();

    this.fingerprintSheetService.getRawPunches(
      this.date,
      employeeCode,
      employeeName,
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

  clearFilters(): void {
    this.date = '';
    this.dateDisplay = '';
    this.searchTerm = '';
    this.pageNumber = 1;
    this.errorMessage = '';
    this.records = [];
    this.totalCount = 0;
    this.totalPages = 0;
  }

  async exportToExcel(): Promise<void> {
    if (!this.date) {
      this.errorMessage = 'يرجى اختيار التاريخ أولاً';
      return;
    }

    this.isExporting = true;
    this.errorMessage = '';

    const { employeeCode, employeeName } = this.splitSearchTerm();

    try {
      const allRecords = await this.fingerprintSheetService.fetchAllRawPunches(
        this.date,
        employeeCode,
        employeeName,
        1000
      );

      if (!allRecords || allRecords.length === 0) {
        this.errorMessage = 'لا توجد بيانات للتصدير';
        this.isExporting = false;
        return;
      }

      this.downloadExcel(allRecords);
    } catch (err) {
      console.error('Failed to export fingerprint sheet', err);
      this.errorMessage = 'فشل تصدير ملف Excel';
      this.isExporting = false;
    }
  }

  private downloadExcel(records: RawPunchRecord[]): void {
    const rows = records.map((item) => ({
      'الموظف': item.employeeName || 'غير محدد',
      'الكود': item.employeeCode || '-',
      'القسم': item['departmentRaw'] || '-',
      'التاريخ': this.formatDisplayValue(item['punchDate'] || item.date || '-'),
      'الدخول': item['inRaw'] || item.time || '-',
      'الخروج': item['outRaw'] || item.punchTime || '-',
      'وقت الاستيراد': this.formatDisplayValue(item['importedAt'] || '-')
    }));

    const worksheet = utils.json_to_sheet(rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'شيت البصمة');

    const fileName = `شيت البصمة.xlsx`;
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