/// <reference types="jasmine" />

import { of } from 'rxjs';
import { AttendanceComponent } from './attendance.component';
import { AttendanceService } from '../service/attendance.service';

describe('AttendanceComponent review state', () => {
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

  it('should treat API rows with needsReview=true as requiring review', () => {
    const row = {
      id: 1,
      needsReview: true,
      notes: []
    };

    expect(component.needsReview(row)).toBeTrue();
    expect(component.isReviewed(row)).toBeFalse();
  });

  it('should read review hints from notes arrays returned by the API', () => {
    const row = {
      id: 2,
      needsReview: false,
      notes: [
        {
          content: 'بصمة خروج من غير دخول - محتاجة مراجعة'
        }
      ]
    };

    expect(component.needsReview(row)).toBeTrue();
    expect(component.isReviewed(row)).toBeFalse();
  });

  it('should save the note once through the status endpoint when only a note changes', () => {
    component.attendanceEditActualIn = '';
    component.attendanceEditActualOut = '';
    component.selectedAttendanceForEdit = {
      actualIn: null,
      actualOut: null,
      notes: ''
    };

    component.saveAttendanceEdit();

    expect(attendanceService.updateAttendanceTime).not.toHaveBeenCalled();
    expect(attendanceService.updateAttendanceStatus).toHaveBeenCalledWith(
      1,
      jasmine.objectContaining({
        note: 'ملاحظة جديدة'
      })
    );
  });
});
