import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EmployeesService } from '../../employees/service/employees.service';
import { AttendanceService } from '../../attendance/service/attendance.service';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(
    private employeesService: EmployeesService,
    private attendanceService: AttendanceService
  ) {}

  getEmployeesSummary(date: string): Observable<any> {
    return this.employeesService.getEmployeesSummary(date);
  }

  getAttendanceByDateRange(
    from: string,
    to: string,
    departmentId: number | null = null,
    status: string = '',
    pageNumber: number = 1,
    pageSize: number = 10000
  ): Observable<any> {
    return this.attendanceService.getAttendanceByDateRange(
      from,
      to,
      departmentId,
      status,
      pageNumber,
      pageSize
    );
  }
}
