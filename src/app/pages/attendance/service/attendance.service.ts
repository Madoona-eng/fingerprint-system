import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AttendancePayload,
  ApiResponse,
  AttendanceStatusPayload,
  AttendanceTimePayload
} from '../model/models';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly apiUrl =
    'https://civil-protect.minya.gov.eg:1089/api/Attendance';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('authToken');

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  bulkImportAttendance(
    attendance: AttendancePayload[]
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/bulk-import`,
      attendance,
      {
        headers: this.getHeaders()
      }
    );
  }

getAttendanceByDateRange(
    from: string,
    to: string,
    departmentId: number | null = null,
    status: string = '',
    pageNumber: number = 1,
    pageSize: number = 10,
    route: string = '',
    employeeName: string | null = null,
    needsReview: boolean | null = null
  ): Observable<any> {
    let params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (departmentId !== null && departmentId !== undefined && departmentId > 0) {
      params = params.set('departmentId', String(departmentId));
    }

    if (status) {
      params = params.set('status', status);
    }

    if (route && route.trim() !== '') {
      params = params.set('route', route.trim());
    }

    if (employeeName !== null && employeeName !== undefined && String(employeeName).trim() !== '') {
      params = params.set('employeeName', String(employeeName).trim());
    }

    if (needsReview !== null && needsReview !== undefined) {
      params = params.set('needsReview', String(needsReview));
    }

    return this.http.get<any>(`${this.apiUrl}/date-range`, {
      headers: this.getHeaders(),
      params
    });
  }
  
  getAttendanceRoutes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/routes`, {
      headers: this.getHeaders()
    });
  }

  getAttendanceSummary(date: string): Observable<any> {
    let params = new HttpParams().set('date', date);

    return this.http.get<any>(`${this.apiUrl}/summary`, {
      headers: this.getHeaders(),
      params
    });
  }

  getRawPunches(
    fromDate: string,
    toDate: string,
    employeeCode: string = '',
    employeeName: string = '',
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<any> {
    let params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate)
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (employeeCode && employeeCode.trim() !== '') {
      params = params.set('employeeCode', employeeCode.trim());
    }

    if (employeeName && employeeName.trim() !== '') {
      params = params.set('employeeName', employeeName.trim());
    }

    return this.http.get<any>(`${this.apiUrl}/raw-punches`, {
      headers: this.getHeaders(),
      params
    });
  }

  getLateSummary(
    from: string,
    to: string,
    employeeName?: string | null,
    deptId?: number | null,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<any> {
    let params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (employeeName !== null && employeeName !== undefined && employeeName.trim() !== '') {
      params = params.set('employeeName', employeeName.trim());
    }

    if (deptId !== null && deptId !== undefined && deptId > 0) {
      params = params.set('deptId', String(deptId));
    }

    return this.http.get<any>(`${this.apiUrl}/late-summary`, {
      headers: this.getHeaders(),
      params
    });
  }

  updateAttendanceTime(
    id: number,
    payload: AttendanceTimePayload
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/time`, payload, {
      headers: this.getHeaders()
    });
  }

  updateAttendanceStatus(
    id: number,
    payload: AttendanceStatusPayload
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, payload, {
      headers: this.getHeaders()
    });
  }

  reviewAttendance(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/review`, null, {
      headers: this.getHeaders()
    });
  }
}
