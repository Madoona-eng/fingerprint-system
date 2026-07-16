import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-employee-delete-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-delete-modal.component.html',
  styleUrls: ['./employee-delete-modal.component.css']
})
export class EmployeeDeleteModalComponent {
  @Input() show = false;
  @Input() message = '';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
