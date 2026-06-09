import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AttendancePayload {
  employeeCode: string;
  date: string;
  actualIn: string | null;
  actualOut: string | null;
}

export interface ApiResponse<T> {
  data: T;
  isSuccess: boolean;
  errorCode: string;
  message: string;
}
export interface AttendanceStatusPayload {
  status: string;
  notes: string;
}
export interface AttendanceTimePayload {
  actualIn: string | null;
  actualOut: string | null;
  notes: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly apiUrl = 'https://civil-protect.minya.gov.eg:1089/api/Attendance';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('jwt');

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  bulkImportAttendance(attendance: AttendancePayload[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/bulk-import`,
      attendance,
      {
        headers: this.getHeaders()
      }
    );
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
  getLateSummary(
  from: string,
  to: string,
  employeeId: number
): Observable<any> {
  const params = new HttpParams()
    .set('from', from)
    .set('to', to)
    .set('employeeId', String(employeeId));

  return this.http.get<any>(`${this.apiUrl}/late-summary`, {
    headers: this.getHeaders(),
    params
  });
}
  getAttendanceByDateRange(
  from: string,
  to: string,
  departmentId: number | null = null,
  status: string = '',
  pageNumber: number = 1,
  pageSize: number = 10
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

  return this.http.get<any>(`${this.apiUrl}/date-range`, {
    headers: this.getHeaders(),
    params
  });
}
}