import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmployeePayload {
  employeeCode?: string;
  name: string;
  departmentId: number;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
}

export interface UpdateEmployeePayload {
  name: string;
  departmentId: number;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
}

export interface BulkImportEmployeePayload {
  employeeCode: string;
  name: string;
  departmentName: string;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
}

export interface Employee {
  id?: number;
  employeeCode: string;
  name: string;
  departmentId?: number;
  departmentName?: string;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
  createdBy?: string;
  createdByUserName?: string;
  lastModifiedBy?: string;
  lastModifiedByUserName?: string;
  lastModifiedAt?: string;
}

export interface ApiResponse<T> {
  data: T;
  isSuccess: boolean;
  errorCode: string;
  message: string;
}

export interface EmployeesPagedData {
  items: Employee[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

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
    pageSize: number = 10
  ): Observable<ApiResponse<EmployeesPagedData>> {
    let params = new HttpParams()
      .set('search', search || '')
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    return this.http.get<ApiResponse<EmployeesPagedData>>(this.apiUrl, {
      headers: this.getHeaders(),
      params
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

  getEmployeesSummary(date: string): Observable<any> {
    const params = new HttpParams().set('date', date);

    return this.http.get<any>(`${this.apiUrl}/summary`, {
      headers: this.getHeaders(),
      params
    });
  }
}