import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Employee } from '../../model/models';

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employees-list.component.html',
  styleUrls: ['./employees-list.component.css']
})
export class EmployeesListComponent {
  @Input() employees: Employee[] = [];
  @Input() searchTerm = '';
  @Input() isLoading = false;
  @Input() pageNumber = 1;
  @Input() pageSize = 10;
  @Input() totalCount = 0;
  @Input() totalPages = 0;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() export = new EventEmitter<void>();
  @Output() editEmployee = new EventEmitter<Employee>();
  @Output() openDetails = new EventEmitter<Employee>();
  @Output() deleteEmployee = new EventEmitter<Employee>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();

  onSearch(): void {
    this.search.emit();
  }

  onClear(): void {
    this.clear.emit();
  }

  trackByEmployee(index: number, employee: Employee): string {
    return employee.employeeCode || String(index);
  }
}
