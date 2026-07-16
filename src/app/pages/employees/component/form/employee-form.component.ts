import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Employee } from '../../model/models';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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

  @Output() submitForm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
