import { of } from 'rxjs';
import { AttendanceComponent } from './attendance.component';
import { AttendanceService } from '../service/attendance.service';

describe('AttendanceComponent', () => {
  let component: AttendanceComponent;
  let attendanceService: jasmine.SpyObj<AttendanceService>;

  beforeEach(() => {
    attendanceService = jasmine.createSpyObj('AttendanceService', [
      'updateAttendanceTime',
      'updateAttendanceStatus'
    ]);

    attendanceService.updateAttendanceTime.and.returnValue(of({ isSuccess: true }));
    attendanceService.updateAttendanceStatus.and.returnValue(of({ isSuccess: true }));

    component = new AttendanceComponent(attendanceService);
    component.attendanceEditId = 1;
    component.attendanceEditStatus = 'Present';
    component.attendanceEditNotes = 'ملاحظة جديدة';
    component.selectedAttendanceForEdit = {
      actualIn: null,
      actualOut: null,
      notes: ''
    };
  });

  it('should send note updates through the time endpoint even when no time fields are changed', () => {
    component.saveAttendanceEdit();

    expect(attendanceService.updateAttendanceTime).toHaveBeenCalledWith(
      1,
      jasmine.objectContaining({
        actualIn: null,
        actualOut: null,
        notes: 'ملاحظة جديدة'
      })
    );
  });
});
