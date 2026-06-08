import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AttendancePayload {
  employeeCode: string;
  date: string;
  actualIn: string;
  actualOut: string;
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
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  bulkImportAttendance(attendance: AttendancePayload[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/bulk-import`, attendance, {
      headers: this.getHeaders()
    });
  }
}