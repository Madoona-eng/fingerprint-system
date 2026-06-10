import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface EmployeePayload {
  employeeCode: string;
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
      'Content-Type': 'application/json',
      Accept: 'application/json'
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
    const params = new HttpParams()
      .set('search', search || '')
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(pageSize));

    return this.http.get<ApiResponse<EmployeesPagedData>>(this.apiUrl, {
      headers: this.getHeaders(),
      params
    });
  }
  getEmployeesSummary(date: string): Observable<any> {
  const params = new HttpParams().set('date', date);

  return this.http.get<any>(`${this.apiUrl}/summary`, {
    headers: this.getHeaders(),
    params
  });
}

  addEmployee(employee: EmployeePayload): Observable<ApiResponse<Employee | boolean>> {
    const payload: EmployeePayload = {
      employeeCode: String(employee.employeeCode || '').trim(),
      name: String(employee.name || '').trim(),
      departmentId: Number(employee.departmentId),
      scheduleIn: String(employee.scheduleIn || '').trim(),
      scheduleOut: String(employee.scheduleOut || '').trim(),
      graceTime: String(employee.graceTime || '').trim()
    };

    return this.http.post<ApiResponse<Employee | boolean>>(this.apiUrl, payload, {
      headers: this.getHeaders()
    });
  }

  updateEmployee(
    id: number,
    employee: EmployeePayload
  ): Observable<ApiResponse<Employee | boolean>> {
    const payload: EmployeePayload = {
      employeeCode: String(employee.employeeCode || '').trim(),
      name: String(employee.name || '').trim(),
      departmentId: Number(employee.departmentId),
      scheduleIn: String(employee.scheduleIn || '').trim(),
      scheduleOut: String(employee.scheduleOut || '').trim(),
      graceTime: String(employee.graceTime || '').trim()
    };

    return this.http.put<ApiResponse<Employee | boolean>>(
      `${this.apiUrl}/${id}`,
      payload,
      {
        headers: this.getHeaders()
      }
    );
  }

  bulkImportEmployees(
    employees: BulkImportEmployeePayload[]
  ): Observable<ApiResponse<any>> {
    const payload: BulkImportEmployeePayload[] = employees.map((employee) => ({
      employeeCode: String(employee.employeeCode || '').trim(),
      name: String(employee.name || '').trim(),
      departmentName: String(employee.departmentName || '').trim(),
      scheduleIn: String(employee.scheduleIn || '').trim(),
      scheduleOut: String(employee.scheduleOut || '').trim(),
      graceTime: String(employee.graceTime || '').trim()
    }));

    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/bulk-import`,
      payload,
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
}