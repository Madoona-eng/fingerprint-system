import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getAttendanceStatusLabel } from '../../../../shared/utils/attendance-status.util';
import { AttendanceNoteEntry, DailyAttendanceRowDto } from '../../model/models';

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

  @Input() filteredDateRangeRows: DailyAttendanceRowDto[] = [];
  @Input() dateRangePageNumber = 1;
  @Input() dateRangeTotalPages = 0;
  @Input() dateRangeTotalCount = 0;
  @Input() isLoadingDateRange = false;
  @Input() dateRangeErrorMessage = '';
  @Input() dateRangeSuccessMessage = '';
  @Input() notesModalOpen = false;
  @Input() notesModalTitle = '';
  @Input() notesModalEntries: AttendanceNoteEntry[] = [];
  @Input() notesModalRow: DailyAttendanceRowDto | null = null;
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

  isManuallyEdited(row: DailyAttendanceRowDto): boolean {
    return row?.isManualOverride === true;
  }

  isReviewed(row: DailyAttendanceRowDto): boolean {
    return row?.isReviewed === true;
  }

  needsReview(row: DailyAttendanceRowDto): boolean {
    return row?.needsReview === true;
  }

  getAttendanceId(row: DailyAttendanceRowDto): number | null {
    return Number.isFinite(row?.id) && row.id > 0 ? row.id : null;
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

  isLatestActionReview(row: DailyAttendanceRowDto): boolean {
    if (!row?.isReviewed) return false;
    if (!row?.isManualOverride) return true;

    const reviewedAt = row.reviewedAt ? new Date(row.reviewedAt).getTime() : 0;
    const modifiedAt = row.lastModifiedAt ? new Date(row.lastModifiedAt).getTime() : 0;

    return reviewedAt >= modifiedAt;
  }

  isLatestActionManualEdit(row: DailyAttendanceRowDto): boolean {
    if (!row?.isManualOverride) return false;
    if (!row?.isReviewed) return true;

    const reviewedAt = row.reviewedAt ? new Date(row.reviewedAt).getTime() : 0;
    const modifiedAt = row.lastModifiedAt ? new Date(row.lastModifiedAt).getTime() : 0;

    return modifiedAt > reviewedAt;
  }
}