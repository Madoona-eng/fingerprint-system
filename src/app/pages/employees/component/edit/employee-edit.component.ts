import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EmployeeFormComponent } from '../form/employee-form.component';

@Component({
  selector: 'app-employee-edit',
  standalone: true,
  imports: [CommonModule, EmployeeFormComponent],
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

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
