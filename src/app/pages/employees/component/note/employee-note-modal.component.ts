import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-note-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-note-modal.component.html',
  styleUrls: ['./employee-note-modal.component.css']
})
export class EmployeeNoteModalComponent {
  private _show = false;

  @Input()
  get show(): boolean {
    return this._show;
  }
  set show(value: boolean) {
    this._show = value;
    if (value) {
      this.draftNote = '';
    }
  }

  @Input() employeeName = '';
  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  draftNote = '';

  confirmNote(): void {
    this.confirm.emit(this.draftNote.trim());
  }
}
