import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getAttendanceStatusLabel } from '../../../../shared/utils/attendance-status.util';
import { AttendanceService } from '../../../attendance/service/attendance.service';
import { AttendanceBasicRow, Employee } from '../../model/models';

interface NoteItem {
  id?: number | string;
  content: string;
  displayName?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-details.component.html',
  styleUrls: ['./employee-details.component.css'],
})
export class EmployeeDetailsComponent {
  // ---- Modal state (shared between employee notes & attendance-row notes) ----
  showNotesModal = false;
  modalNotesTitle = 'الملاحظات';
  modalNotes: NoteItem[] = [];
  isLoadingRowNotes = false;

  @Input() selectedEmployeeForDetails: Employee | null = null;
  @Input() employeeDetailsRows: AttendanceBasicRow[] = [];
  @Input() isLoadingEmployeeDetails = false;
  @Input() employeeDetailsPageNumber = 1;
  @Input() employeeDetailsTotalPages = 0;
  @Input() employeeDetailsTotalCount = 0;
  @Input() employeeDetailsFromDisplay = '';
  @Input() employeeDetailsToDisplay = '';
  @Input() employeeDetailsFrom = '';
  @Input() employeeDetailsTo = '';

  @Output() back = new EventEmitter<void>();
  @Output() applyFilter = new EventEmitter<void>();
  @Output() clearFilter = new EventEmitter<void>();
  @Output() exportDetails = new EventEmitter<void>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() openDatePicker = new EventEmitter<HTMLInputElement>();
  @Output() nativeDatePicked = new EventEmitter<{ event: Event; field: 'from' | 'to' }>();
  @Output() dateInputChanged = new EventEmitter<{ field: 'from' | 'to'; value: string }>();
  @Output() deleteEmployeeNote = new EventEmitter<number | string>();

  constructor(private attendanceService: AttendanceService) {}

  getStatusLabel(status: unknown): string {
    return getAttendanceStatusLabel(status);
  }

  formatMinutesToHours(value: unknown): string {
    const minutes = Number(value);

    if (!Number.isFinite(minutes) || minutes < 0) {
      return '-';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);

    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}`;
  }

  // =========================================================
  // Employee notes (EmployeeDetailsDto.Notes -> EmployeeNoteDto[])
  // =========================================================

  getEmployeeNoteItems(): NoteItem[] {
    const notes = this.selectedEmployeeForDetails?.notes;

    if (!Array.isArray(notes)) {
      return [];
    }

    return notes
      .filter((n) => Boolean(n?.content))
      .map((n) => ({
        id: n.id,
        content: n.content,
        displayName: n.createdByUserName,
        createdAt: n.createdAt,
      }));
  }

  getEmployeeNotes(): string[] {
    return this.getEmployeeNoteItems().map((item) => item.content);
  }

  openEmployeeNotesModal(): void {
    this.modalNotesTitle = 'ملاحظات الموظف';
    this.modalNotes = this.getEmployeeNoteItems();
    this.showNotesModal = true;
  }

  deleteEmployeeNoteById(noteId: number | string | undefined): void {
    if (noteId == null) {
      return;
    }

    this.deleteEmployeeNote.emit(noteId);
  }

  // =========================================================
  // Attendance row notes (GET /Attendance/{id}/notes -> AttendanceNoteDto[])
  // =========================================================

  openRowNotesModal(row: AttendanceBasicRow): void {
    this.modalNotesTitle = `الملاحظات - ${row?.date || 'السجل'}`;
    this.modalNotes = [];
    this.showNotesModal = true;

    if (!row?.id) {
      console.warn('Row is missing attendance id, cannot fetch notes.', row);
      return;
    }

    this.isLoadingRowNotes = true;

    this.attendanceService.getAttendanceNotes(row.id).subscribe({
      next: (response) => {
        this.isLoadingRowNotes = false;

        if (response?.isSuccess && Array.isArray(response.data)) {
          this.modalNotes = response.data.map((n) => ({
            id: n.id,
            content: n.content,
            displayName: n.displayName,
            createdAt: n.createdAt,
          }));
        }
      },
      error: (err) => {
        this.isLoadingRowNotes = false;
        console.error('Failed to load attendance notes:', err);
      },
    });
  }
}