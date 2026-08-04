import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-attendance-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-import.component.html',
  styleUrls: ['../attendance.component.css'],
})
export class AttendanceImportComponent {
  @Input() excelFileName = '';
  @Input() successMessage = '';
  @Input() errorMessage = '';
  @Input() rowErrors: string[] = [];
  @Input() sheetPreviewRows: Array<{ [key: string]: any }> = [];
  @Input() sheetPreviewHeaders: string[] = [];
  @Input() attendanceRowsLength = 0;
  @Input() isImporting = false;
  @Input() hasImportedCurrentSheet = false;

  @Output() fileSelected = new EventEmitter<File>();
  @Output() importAttendance = new EventEmitter<void>();
  @Output() clearData = new EventEmitter<void>();

  onAttendanceSheetSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.fileSelected.emit(file);
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

    this.fileSelected.emit(file);
  }
}
