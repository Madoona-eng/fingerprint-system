import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Employee } from '../../model/models';
import { getAttendanceStatusLabel } from '../../../../shared/utils/attendance-status.util';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-details.component.html',
  styleUrls: ['./employee-details.component.css']
})
export class EmployeeDetailsComponent {
  @Input() selectedEmployeeForDetails: Employee | null = null;
  @Input() employeeDetailsRows: any[] = [];
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

  getStatusLabel(status: unknown): string {
    return getAttendanceStatusLabel(status);
  }

  getEmployeeNotes(): string[] {
    return this.getEmployeeNoteItems().map((item) => item.content);
  }

  getEmployeeNoteItems(): Array<{ id?: number | string; content: string }> {
    const notes = this.selectedEmployeeForDetails?.note ?? this.selectedEmployeeForDetails?.notes;

    if (Array.isArray(notes)) {
      return notes
        .map((item) => this.normalizeEmployeeNoteItem(item))
        .filter((item): item is { id?: number | string; content: string } => Boolean(item?.content));
    }

    const singleNote = this.normalizeNoteValue(notes);
    return singleNote ? [{ content: singleNote }] : [];
  }

  getRowNotesLabel(notes: unknown): string {
    const normalized = this.normalizeNoteValue(notes);
    return normalized || '-';
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

  deleteEmployeeNoteById(noteId: number | string | undefined): void {
    if (noteId == null) {
      return;
    }

    this.deleteEmployeeNote.emit(noteId);
  }

  private normalizeEmployeeNoteItem(note: unknown): { id?: number | string; content: string } | null {
    if (typeof note === 'string') {
      const text = this.normalizeNoteValue(note);
      return text ? { content: text } : null;
    }

    if (note && typeof note === 'object') {
      const candidate = note as {
        id?: number | string;
        text?: string;
        note?: string;
        content?: string;
        description?: string;
        value?: string;
        name?: string;
      };

      const text = candidate.content || candidate.text || candidate.note || candidate.description || candidate.value || candidate.name;
      if (typeof text === 'string' && text.trim() && !this.isFrameworkTypeName(text)) {
        return {
          id: candidate.id,
          content: text.trim()
        };
      }
    }

    return null;
  }

  private normalizeNoteValue(note: unknown): string {
    if (Array.isArray(note)) {
      return note
        .map((item) => this.extractNoteText(item))
        .filter((item): item is string => Boolean(item))
        .join(', ');
    }

    if (typeof note === 'string') {
      const text = note.trim();
      if (!text || this.isFrameworkTypeName(text)) {
        return '';
      }

      return text;
    }

    if (note && typeof note === 'object') {
      return this.extractNoteText(note);
    }

    return '';
  }

  private extractNoteText(note: unknown): string {
    if (typeof note === 'string') {
      const text = note.trim();
      if (!text || this.isFrameworkTypeName(text)) {
        return '';
      }

      return text;
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
      const text = candidate.text || candidate.note || candidate.content || candidate.description || candidate.value || candidate.name;
      if (typeof text === 'string' && text.trim() && !this.isFrameworkTypeName(text)) {
        return text.trim();
      }
    }

    return '';
  }

  private isFrameworkTypeName(value: string): boolean {
    return /(System\.Collections\.Generic\.(HashSet|List)|HashSet`|ICollection|IEnumerable)/i.test(value);
  }
}
