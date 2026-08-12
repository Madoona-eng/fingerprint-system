import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EmployeeFormComponent } from '../form/employee-form.component';

import { MatIconModule } from '@angular/material/icon'; 

@Component({
  selector: 'app-employee-edit',
  standalone: true,
  imports: [CommonModule, EmployeeFormComponent, MatIconModule],
  templateUrl: './employee-edit.component.html',
  styleUrls: ['./employee-edit.component.css']
})
export class EmployeeEditComponent {
  @Input() employeeForm!: FormGroup;
  @Input() selectedEmployeeId: number | null = null;
  @Input() isSaving = false;
  @Input() successMessage = '';
  @Input() errorMessage = '';
  @Input() departmentOptions: { id: number; name: string }[] = [];
  @Input() isDepartmentSelectionEnabled = false;
  @Input() locationOptions: Array<{ id: number; name: string }> = [];
  @Input() selectedLocationId: number | null = null;
  @Input() showLocationSelector = false;

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() locationChanged = new EventEmitter<number | null>();
}
