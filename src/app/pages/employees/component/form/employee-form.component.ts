import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
export class EmployeeFormComponent implements OnChanges {
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeForm'] || changes['isDepartmentSelectionEnabled'] || changes['selectedLocationId']) {
      this.syncDepartmentControlState();
    }
  }

  private syncDepartmentControlState(): void {
    if (!this.employeeForm) {
      return;
    }

    const departmentControl = this.employeeForm.get('departmentId');

    if (!departmentControl) {
      return;
    }

    const shouldEnable = this.isDepartmentSelectionEnabled && this.selectedLocationId !== null;

    if (shouldEnable) {
      departmentControl.enable({ emitEvent: false });
      return;
    }

    departmentControl.disable({ emitEvent: false });
    departmentControl.setValue(null, { emitEvent: false });
  }
}