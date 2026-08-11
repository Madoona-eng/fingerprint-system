/// <reference types="jasmine" />

import { AttendanceComponent } from './attendance.component';
import { AttendanceService } from '../service/attendance.service';
import { AuthService } from '../../../auth/Services/auth.service';
import { EmployeesService } from '../../employees/service/employees.service';

describe('AttendanceComponent export', () => {
  let component: AttendanceComponent;

  beforeEach(() => {
    component = new AttendanceComponent(
      {} as AttendanceService,
      { getUserRole: () => 'Admin' } as AuthService,
      {} as EmployeesService,
    );
  });

  it('includes schedule in/out columns in attendance export rows', () => {
    const row = {
      employeeCode: 'E1',
      employeeName: 'Ali',
      departmentName: 'IT',
      date: '2026-08-11',
      scheduleIn: '08:00',
      scheduleOut: '17:00',
      actualIn: '08:15',
      actualOut: '17:05',
      status: 'Present',
      lateMinutes: 15,
      workedMinutes: 480,
    };

    const exportRow = (component as any).getAttendanceExportRow(row);

    expect(exportRow['معاد الحضور']).toBe('08:00');
    expect(exportRow['معاد الانصراف']).toBe('17:00');
  });
});
