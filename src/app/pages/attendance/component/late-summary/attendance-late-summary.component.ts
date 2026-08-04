import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-attendance-late-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-late-summary.component.html',
  styleUrls: ['../attendance.component.css'],
})
export class AttendanceLateSummaryComponent {
  @Input() lateSummaryFrom = '';
  @Input() lateSummaryTo = '';
  @Input() lateSummaryFromDisplay = '';
  @Input() lateSummaryToDisplay = '';
  @Input() lateSummaryEmployeeSearch = '';
  @Input() lateSummaryLocationId: number | null = null;
  @Input() lateSummaryDepartmentId: number | null = null;
  @Input() lateSummaryRows: any[] = [];
  @Input() lateSummaryData: any = null;
  @Input() lateSummaryPageNumber = 1;
  @Input() lateSummaryTotalPages = 0;
  @Input() lateSummaryErrorMessage = '';
  @Input() lateSummarySuccessMessage = '';
  @Input() isLoadingLateSummary = false;
  @Input() isSuperAdmin = false;
  @Input() locations: { id: number; name: string }[] = [];
  @Input() departmentOptions: { id: number; name: string }[] = [];

  @Output() lateSummaryFromDisplayChange = new EventEmitter<string>();
  @Output() lateSummaryToDisplayChange = new EventEmitter<string>();
  @Output() lateSummaryEmployeeSearchChange = new EventEmitter<string>();
  @Output() lateSummaryLocationIdChange = new EventEmitter<number | null>();
  @Output() lateSummaryDepartmentIdChange = new EventEmitter<number | null>();
  @Output() loadLateSummary = new EventEmitter<void>();
  @Output() clearLateSummary = new EventEmitter<void>();
  @Output() exportLateSummaryToExcel = new EventEmitter<void>();
  @Output() onLocationChange = new EventEmitter<number | null>();
  @Output() openNativeDatePicker = new EventEmitter<HTMLInputElement>();
  @Output() nativeDatePicked = new EventEmitter<{ event: Event; field: 'from' | 'to' }>();
  @Output() previousLateSummaryPage = new EventEmitter<void>();
  @Output() nextLateSummaryPage = new EventEmitter<void>();
}
