import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AttendanceService } from '../../attendance/service/attendance.service';

@Injectable({
  providedIn: 'root'
})
export class FingerprintSheetService {
  constructor(private attendanceService: AttendanceService) {}

  getRawPunches(
    fromDate: string,
    toDate: string,
    employeeCode: string = '',
    employeeName: string = '',
    pageNumber: number = 1,
    pageSize: number = 10
  ) {
    return this.attendanceService.getRawPunches(
      fromDate,
      toDate,
      employeeCode,
      employeeName,
      pageNumber,
      pageSize
    );
  }

  async fetchAllRawPunches(
    fromDate: string,
    toDate: string,
    employeeCode: string = '',
    employeeName: string = '',
    perPage: number = 1000
  ): Promise<any[]> {
    const allRecords: any[] = [];
    let page = 1;
    let totalPages = 1;

    try {
      while (page <= totalPages) {
        const resp: any = await firstValueFrom(
          this.attendanceService.getRawPunches(
            fromDate,
            toDate,
            employeeCode,
            employeeName,
            page,
            perPage
          )
        );

        const data = resp?.data ?? resp;
        let items: any[] = [];

        if (Array.isArray(data?.items)) {
          items = data.items;
          totalPages = data.totalPages || 1;
        } else if (Array.isArray(data)) {
          items = data;
          totalPages = 1;
        } else {
          items = [];
          totalPages = 0;
        }

        allRecords.push(...items);
        page++;
      }
    } catch (err) {
      throw err;
    }

    return allRecords;
  }
}
