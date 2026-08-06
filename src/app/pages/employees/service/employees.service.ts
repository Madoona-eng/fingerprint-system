import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EmployeePayload,
  UpdateEmployeePayload,
  BulkImportEmployeePayload,
  Employee,
  ApiResponse,
  EmployeesPagedData
} from '../model/models';

@Injectable({
  providedIn: 'root'
})
export class EmployeesService {
  private readonly apiUrl = 'https://civil-protect.minya.gov.eg:1089/api/Employees';

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

  getEmployees(
    search: string = '',
    pageNumber: number = 1,
    pageSize: number = 10,
    departmentId: number | null = null,
    locationId: number | null = null
  ): Observable<ApiResponse<EmployeesPagedData>> {
    let params = new HttpParams()
      .set('search', search || '')
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (departmentId !== null && departmentId !== undefined && departmentId > 0) {
      params = params.set('departmentId', String(departmentId));
    }

    if (locationId !== null && locationId !== undefined && locationId > 0) {
      params = params.set('locationId', String(locationId));
    }

    return this.http.get<ApiResponse<EmployeesPagedData>>(this.apiUrl, {
      headers: this.getHeaders(),
      params
    });
  }

  getDepartments(locationId: number | null = null): Observable<any> {
    let params = new HttpParams();

    if (locationId !== null && locationId !== undefined && locationId > 0) {
      params = params.set('locationId', String(locationId));
    }

    return this.http.get<any>('https://civil-protect.minya.gov.eg:1089/api/Departments', {
      headers: this.getHeaders(),
      params
    });
  }

  getLocations(): Observable<any> {
    return this.http.get<any>('https://civil-protect.minya.gov.eg:1089/api/Locations', {
      headers: this.getHeaders()
    });
  }

  addEmployee(
    employee: EmployeePayload
  ): Observable<ApiResponse<Employee | boolean>> {
    return this.http.post<ApiResponse<Employee | boolean>>(this.apiUrl, employee, {
      headers: this.getHeaders()
    });
  }

  updateEmployee(
    id: number,
    employee: UpdateEmployeePayload
  ): Observable<ApiResponse<Employee | boolean>> {
    return this.http.put<ApiResponse<Employee | boolean>>(
      `${this.apiUrl}/${id}`,
      employee,
      {
        headers: this.getHeaders()
      }
    );
  }

  bulkImportEmployees(
    employees: BulkImportEmployeePayload[]
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/bulk-import`,
      employees,
      {
        headers: this.getHeaders()
      }
    );
  }

  getEmployeeById(
    id: number,
    from: string = '',
    to: string = '',
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<any> {
    let params = new HttpParams()
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    if (from) {
      params = params.set('from', from);
    }

    if (to) {
      params = params.set('to', to);
    }

    return this.http.get<any>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
      params
    });
  }

  deleteEmployee(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  addEmployeeNote(id: number, content: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.apiUrl}/${id}/notes`,
      { content },
      {
        headers: this.getHeaders()
      }
    );
  }

  deleteEmployeeNote(noteId: number | string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(
      `${this.apiUrl}/notes/${noteId}`,
      {
        headers: this.getHeaders()
      }
    );
  }

  getEmployeesSummary(date: string): Observable<any> {
    const params = new HttpParams().set('date', this.normalizeSummaryDate(date));

    let headers = new HttpHeaders({ Accept: 'application/json' });
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('jwt');

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<any>(`${this.apiUrl}/summary`, {
      headers,
      params
    });
  }

  getSystemSettings(): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(
      'https://civil-protect.minya.gov.eg:1089/api/SystemSettings',
      {
        headers: this.getHeaders()
      }
    );
  }

  updateSystemSettings(enabled: boolean): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(
      'https://civil-protect.minya.gov.eg:1089/api/SystemSettings',
      { enabled },
      {
        headers: this.getHeaders()
      }
    );
  }

  private normalizeSummaryDate(date: string): string {
    const value = String(date || '').trim();
    if (!value) {
      return value;
    }

    const isoMatch = value.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}-${month}-${year}`;
    }

    const slashIsoMatch = value.match(/^([0-9]{4})\/([0-9]{2})\/([0-9]{2})$/);
    if (slashIsoMatch) {
      const [, year, month, day] = slashIsoMatch;
      return `${day}-${month}-${year}`;
    }

    const dashDayMatch = value.match(/^([0-9]{2})-([0-9]{2})-([0-9]{4})$/);
    if (dashDayMatch) {
      return value;
    }

    const slashDayMatch = value.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/);
    if (slashDayMatch) {
      return value.replace(/[\/]/g, '-');
    }

    return value;
  }
}
