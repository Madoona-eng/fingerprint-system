import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getAttendanceStatusLabel } from '../../../../shared/utils/attendance-status.util';

@Component({
  selector: 'app-attendance-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-report.component.html',
  styleUrls: ['../attendance.component.css'],
})
export class AttendanceReportComponent {
  @Input() dateRangeFrom = '';
  @Input() dateRangeTo = '';
  @Input() dateRangeFromDisplay = '';
  @Input() dateRangeToDisplay = '';
  @Input() employeeSearchTerm = '';
  @Input() selectedLocationId: number | null = null;
  @Input() dateRangeDepartmentId: number | null = null;
  @Input() dateRangeStatus = '';
  @Input() dateRangeNeedsReview: boolean | null = null;
  @Input() dateRangeRoute = '';
  @Input() routeOptions: string[] = [];

  private readonly statusApiValues: string[] = [
    'Present',
    'Late',
    'Absent',
    'EarlyDeparture',
    'PersonalLeave',
    'Mission',
    'DrivingRoute',
    'OnLeave',
    'Online',
  ];

  private _statusOptions: { value: string; label: string }[] = [];

  @Input()
  set statusOptions(value: { value: string; label: string }[]) {
    this._statusOptions = value || [];
  }

  get statusOptions(): { value: string; label: string }[] {
    return this._statusOptions.length > 0
      ? this._statusOptions
      : this.statusApiValues.map((value) => ({
          value,
          label: this.getAttendanceStatusLabel(value),
        }));
  }

  @Input() filteredDateRangeRows: any[] = [];
  @Input() dateRangePageNumber = 1;
  @Input() dateRangeTotalPages = 0;
  @Input() dateRangeTotalCount = 0;
  @Input() isLoadingDateRange = false;
  @Input() dateRangeErrorMessage = '';
  @Input() dateRangeSuccessMessage = '';
  @Input() notesModalOpen = false;
  @Input() notesModalTitle = '';
  @Input() notesModalEntries: Array<{ content: string; displayName?: string; createdAt?: string }> = [];
  @Input() reviewingAttendanceId: number | null = null;
  @Input() isSuperAdmin = false;
  @Input() locations: { id: number; name: string }[] = [];
  @Input() departmentOptions: { id: number; name: string }[] = [];

  @Output() dateRangeInputChange = new EventEmitter<{ value: string; field: 'from' | 'to' }>();
  @Output() openNativeDatePicker = new EventEmitter<HTMLInputElement>();
  @Output() nativeDatePicked = new EventEmitter<{ event: Event; field: 'from' | 'to' }>();
  @Output() applyDateRangeFilter = new EventEmitter<void>();
  @Output() clearDateRangeFilter = new EventEmitter<void>();
  @Output() exportAttendanceReportToExcel = new EventEmitter<void>();
  @Output() previousDateRangePage = new EventEmitter<void>();
  @Output() nextDateRangePage = new EventEmitter<void>();
  @Output() onEmployeeSearchInputChange = new EventEmitter<void>();
  @Output() employeeSearchTermChange = new EventEmitter<string>();
  @Output() dateRangeNeedsReviewChange = new EventEmitter<boolean | null>();
  @Output() markAttendanceReviewed = new EventEmitter<any>();
  @Output() openAttendanceEdit = new EventEmitter<any>();
  @Output() openNotesModal = new EventEmitter<any>();
  @Output() closeNotesModal = new EventEmitter<void>();
  @Output() onLocationChange = new EventEmitter<number | null>();
  @Output() dateRangeDepartmentIdChange = new EventEmitter<number | null>();
  @Output() dateRangeStatusChange = new EventEmitter<string>();
  @Output() dateRangeRouteChange = new EventEmitter<string>();

  getAttendanceStatusLabel(status: any): string {
    return getAttendanceStatusLabel(status);
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
      case 'PersonalLeave':
      case 'DrivingRoute':
      case 'OnLeave':
        return 'status-permission';
      default:
        return 'status-default';
    }
  }

  private normalizeNotesValue(notes: unknown): string {
    if (!notes) {
      return '';
    }

    if (typeof notes === 'string') {
      return notes.trim();
    }

    if (Array.isArray(notes)) {
      return notes
        .map((note) => (typeof note === 'string' ? note : String((note as any).content || '')))
        .filter(Boolean)
        .join(', ');
    }

    if (typeof notes === 'object' && notes !== null) {
      const candidate = notes as { content?: string; note?: string; text?: string };
      return String(candidate.content || candidate.note || candidate.text || '').trim();
    }

    return '';
  }

  isReviewed(row: any): boolean {
    const normalizedNotes = this.normalizeNotesValue(row?.notes).toLowerCase();
    const reviewFlag = [row?.isReviewed, row?.reviewed, row?.isReviewCompleted, row?.hasBeenReviewed].some(
      (value) => value === true,
    );

    return (
      reviewFlag ||
      normalizedNotes.includes('تمت المراجعة') ||
      normalizedNotes.includes('تمت مراجعه') ||
      normalizedNotes.includes('reviewed')
    );
  }

  needsReview(row: any): boolean {
    if (this.isReviewed(row)) {
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

  getAttendanceNotes(notes: unknown): string[] {
    const normalized = this.normalizeNotesValue(notes);
    if (!normalized) {
      return [];
    }

    return normalized
      .split(/[,،;]/)
      .map((note) => note.trim())
      .filter(Boolean);
  }

  getAttendanceId(row: any): number | null {
    const id = row?.id || row?.attendanceId || row?.attendanceRecordId;
    if (!id) {
      return null;
    }
    const numberId = Number(id);
    return Number.isFinite(numberId) && numberId > 0 ? numberId : null;
  }

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
}
