import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Employee } from '../../model/models';

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

  getStatusLabel(status: unknown): string {
    const value = String(status ?? '').trim();

    if (!value) {
      return '-';
    }

    const normalized = value.toLowerCase();
    const translations: Record<string, string> = {
      present: 'حاضر',
      absent: 'غائب',
      late: 'متأخر',
      earlydeparture: 'انصراف مبكر',
      early_departure: 'انصراف مبكر',
      overtime: 'إضافي',
      ontime: 'في الميعاد',
      'في الميعاد': 'في الميعاد',
      حاضر: 'حاضر',
      غائب: 'غائب',
      متأخر: 'متأخر',
      'انصراف مبكر': 'انصراف مبكر'
    };

    return translations[normalized] || value;
  }
}
