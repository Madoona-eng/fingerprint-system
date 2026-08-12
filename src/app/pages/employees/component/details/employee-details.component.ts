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
  showNotesModal = false;
  modalNotesTitle = 'الملاحظات';
  modalNotes: Array<{ content: string; displayName?: string; createdAt?: string }> = [];

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

  openEmployeeNotesModal(): void {
    const employeeNotes = this.getEmployeeNoteItems();

    this.modalNotesTitle = 'ملاحظات الموظف';
    this.modalNotes = employeeNotes.map((item) => ({
      content: item.content,
      displayName: item.displayName,
      createdAt: item.createdAt,
    }));
    this.showNotesModal = true;
  }

  getEmployeeNoteItems(): Array<{ id?: number | string; content: string; displayName?: string; createdAt?: string }> {
    const notes = this.selectedEmployeeForDetails?.note ?? this.selectedEmployeeForDetails?.notes;

    if (Array.isArray(notes)) {
      return notes
        .map((item) => this.normalizeEmployeeNoteItem(item))
        .filter(
          (item): item is { id?: number | string; content: string; displayName?: string; createdAt?: string } => Boolean(item?.content),
        );
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

  openRowNotesModal(row: any): void {
    const parsedNotes = this.extractRowNotes(row?.notes);

    this.modalNotesTitle = `الملاحظات - ${row?.date || row?.attendanceDate || row?.from || 'السجل'}`;
    this.modalNotes = parsedNotes;
    this.showNotesModal = true;
  }

  deleteEmployeeNoteById(noteId: number | string | undefined): void {
    if (noteId == null) {
      return;
    }

    this.deleteEmployeeNote.emit(noteId);
  }

  private extractRowNotes(notes: unknown): Array<{ content: string; displayName?: string; createdAt?: string }> {
    if (Array.isArray(notes)) {
      return notes
        .map((item) => this.normalizeNoteEntry(item))
        .filter((item): item is { content: string; displayName?: string; createdAt?: string } => Boolean(item?.content));
    }

    const singleNote = this.normalizeNoteValue(notes);
    return singleNote ? [{ content: singleNote }] : [];
  }

  private normalizeNoteEntry(note: unknown): { content: string; displayName?: string; createdAt?: string } | null {
    if (typeof note === 'string') {
      const text = this.normalizeNoteValue(note);
      return text ? { content: text } : null;
    }

    if (note && typeof note === 'object') {
      const candidate = note as {
        id?: number | string;
        text?: string;
        note?: string;
        content?: string | object | unknown[];
        description?: string;
        value?: string | object | unknown[];
        name?: string;
        displayName?: string;
        createdAt?: string;
      };

      const text = this.findNoteText(candidate);
      if (typeof text === 'string' && text.trim() && !this.isFrameworkTypeName(text)) {
        return {
          content: text.trim(),
          displayName: candidate.displayName?.trim() || undefined,
          createdAt: candidate.createdAt?.trim() || undefined,
        };
      }
    }

    return null;
  }

  private normalizeEmployeeNoteItem(note: unknown): { id?: number | string; content: string; displayName?: string; createdAt?: string } | null {
    if (typeof note === 'string') {
      const text = this.normalizeNoteValue(note);
      return text ? { content: text } : null;
    }

    if (note && typeof note === 'object') {
      const candidate = note as {
        id?: number | string;
        text?: string | object | unknown[];
        note?: string | object | unknown[];
        content?: string | object | unknown[];
        description?: string | object | unknown[];
        value?: string | object | unknown[];
        name?: string;
        displayName?: string;
        createdByUserName?: string;
        createdAt?: string;
      };

      const text = this.findNoteText(candidate);
      if (typeof text === 'string' && text.trim() && !this.isFrameworkTypeName(text)) {
        return {
          id: candidate.id,
          content: text.trim(),
          displayName: candidate.displayName || candidate.createdByUserName || undefined,
          createdAt: candidate.createdAt || undefined,
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

    if (Array.isArray(note)) {
      return note
        .map((item) => this.extractNoteText(item))
        .filter((item) => Boolean(item))
        .join(', ');
    }

    if (note && typeof note === 'object') {
      const text = this.findNoteText(note);
      if (typeof text === 'string' && text.trim() && !this.isFrameworkTypeName(text)) {
        return text.trim();
      }
    }

    return '';
  }

  private findNoteText(note: unknown): string | undefined {
    if (typeof note === 'string') {
      const text = note.trim();
      return text && !this.isFrameworkTypeName(text) ? text : undefined;
    }

    if (Array.isArray(note)) {
      const joined = note
        .map((item) => this.findNoteText(item))
        .filter((item): item is string => Boolean(item))
        .join(', ');

      return joined || undefined;
    }

    if (note && typeof note === 'object') {
      const candidate = note as Record<string, unknown>;

      const directKeys = ['content', 'text', 'note', 'description', 'value', 'body', 'message', 'comment', 'remark', 'remarks', 'title', 'summary', 'name'];

      for (const key of directKeys) {
        const found = this.findNoteText(candidate[key]);
        if (found) {
          return found;
        }
      }

      for (const value of Object.values(candidate)) {
        const found = this.findNoteText(value);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  private isFrameworkTypeName(value: string): boolean {
    return /(System\.Collections\.Generic\.(HashSet|List)|HashSet`|ICollection|IEnumerable)/i.test(value);
  }
}
