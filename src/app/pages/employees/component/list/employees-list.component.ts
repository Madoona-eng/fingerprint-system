import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Employee } from '../../model/models';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSlideToggleModule, MatButtonModule],
  templateUrl: './employees-list.component.html',
  styleUrls: ['./employees-list.component.css']
})
export class EmployeesListComponent {
  @Input() employees: Employee[] = [];
  @Input() searchTerm = '';
  @Input() departmentId: number | null = null;
  @Input() locationOptions: Array<{ id: number; name: string }> = [];
  @Input() selectedLocationId: number | null = null;
  @Input() departmentOptions: Array<{ id: number; name: string }> = [];
  @Input() isLoading = false;
  @Input() pageNumber = 1;
  @Input() pageSize = 10;
  @Input() totalCount = 0;
  @Input() totalPages = 0;
  @Input() systemSettingsData: boolean | null = null;
  @Input() systemSettingsUpdating = false;
  confirmToggle = false;

  // 1. إضافة إدخال الصلاحية هنا
  @Input() isSuperAdmin = false; 

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() departmentChange = new EventEmitter<number | null>();
  @Output() locationChange = new EventEmitter<number | null>();
  @Output() search = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() export = new EventEmitter<void>();
  @Output() toggleSystemSettings = new EventEmitter<void>();
  @Output() editEmployee = new EventEmitter<Employee>();
  @Output() openDetails = new EventEmitter<Employee>();
  @Output() openNote = new EventEmitter<Employee>();
  @Output() deleteEmployee = new EventEmitter<Employee>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();

  onSearch(): void {
    this.search.emit();
  }

  onToggleClick(): void {
    if (this.systemSettingsUpdating || this.systemSettingsData === null) {
      return;
    }

    // Immediate toggle on pill click
    this.toggleSystemSettings.emit();
  }

  openConfirm(): void {
    if (this.systemSettingsUpdating || this.systemSettingsData === null) {
      return;
    }

    this.confirmToggle = true;
  }

  confirmToggleYes(): void {
    this.toggleSystemSettings.emit();
    this.confirmToggle = false;
  }

  confirmToggleNo(): void {
    this.confirmToggle = false;
  }

  onClear(): void {
    this.clear.emit();
  }

  trackByEmployee(index: number, employee: Employee): string {
    return employee.employeeCode || String(index);
  }
}