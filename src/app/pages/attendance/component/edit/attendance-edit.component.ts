import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon'; // 👈 استيراد الموديول الخاص بالأيقونات

@Component({
  selector: 'app-attendance-edit',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatIconModule // 👈 إضافته هنا
  ],
  templateUrl: './attendance-edit.component.html',
  styleUrls: ['./attendance-edit.component.css'],
})
export class AttendanceEditComponent {
  @Input() attendanceEditEmployeeCode = '';
  @Input() attendanceEditEmployeeName = '';
  @Input() attendanceEditDepartmentName = '';
  @Input() attendanceEditDate = '';
  @Input() attendanceEditStatus = '';
  @Input() attendanceEditNotes = '';
  @Input() attendanceEditErrorMessage = '';
  @Input() attendanceEditSuccessMessage = '';
  @Input() isSavingAttendanceEdit = false;
  @Input() statusOptions: { value: string; label: string }[] = [];

  @Output() attendanceEditStatusChange = new EventEmitter<string>();
  @Output() attendanceEditNotesChange = new EventEmitter<string>();
  @Output() saveAttendanceEdit = new EventEmitter<void>();
  @Output() cancelAttendanceEdit = new EventEmitter<void>();
}