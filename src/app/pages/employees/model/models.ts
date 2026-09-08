export interface EmployeePayload {
  employeeCode?: string;
  name: string;
  departmentId: number;
  locationId?: number;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
  isChristian?: boolean;
  note?: string;
}

export interface UpdateEmployeePayload {
  name: string;
  departmentId: number;
  locationId?: number;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
  isChristian?: boolean;
  note?: string;
}

export interface BulkImportEmployeePayload {
  employeeCode: string;
  name: string;
  departmentName: string;
  locationId?: number;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
  note?: string;
  isChristian?: boolean;
}

// ============ Employee Core Models ============

export interface EmployeeNote {
  id: number;
  content: string;
  createdByUserName: string;
  createdAt: string;
  isActive: boolean;
}

export interface Employee {
  id?: number;
  employeeCode: string;
  name: string;
  departmentId?: number;
  departmentName?: string;
  locationId?: number;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
  note?: string;
  isChristian?: boolean;
  notes?: EmployeeNote[];
  createdBy?: string;
  createdByUserName?: string;
  lastModifiedBy?: string;
  lastModifiedByUserName?: string;
  lastModifiedAt?: string;
}

// ============ Attendance ============

export interface AttendanceBasicRow {
  id: number;
  date: string;
  actualIn?: string | null;
  actualOut?: string | null;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
  workedMinutes?: number | null;
  lateMinutes?: number | null;
  overtimeMinutes?: number | null;
  status: string;
  isManualOverride: boolean;
}

// ============ Shared API Wrappers ============

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
