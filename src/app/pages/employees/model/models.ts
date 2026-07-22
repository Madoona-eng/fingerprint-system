export interface EmployeePayload {
  employeeCode?: string;
  name: string;
  departmentId: number;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
  note?: string;
}

export interface UpdateEmployeePayload {
  name: string;
  departmentId: number;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
  note?: string;
}

export interface BulkImportEmployeePayload {
  employeeCode: string;
  name: string;
  departmentName: string;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
  note?: string;
  isChristian?: boolean;
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
  note?: string;
  isChristian?: boolean;
  notes?: unknown[] | string | null;
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
