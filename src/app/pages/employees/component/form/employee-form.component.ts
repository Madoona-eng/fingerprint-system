import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Employee } from '../../model/models';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.css']
})
export class EmployeeFormComponent {
  @Input() employeeForm!: FormGroup;
  @Input() selectedEmployeeId: number | null = null;
  @Input() isSaving = false;
  @Input() successMessage = '';
  @Input() errorMessage = '';
  @Input() departmentOptions: { id: number; name: string }[] = [];
  @Input() hideNotes = false;
  @Input() showPageShell = false;
  @Input() isDepartmentSelectionEnabled = false;
  @Input() locationOptions: Array<{ id: number; name: string }> = [];
  @Input() selectedLocationId: number | null = null;
  @Input() showLocationSelector = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() locationChanged = new EventEmitter<number | null>();

  onLocationSelectChanged(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const rawValue = target?.value ?? '';
    this.locationChanged.emit(rawValue === '' ? null : Number(rawValue));
  }
}