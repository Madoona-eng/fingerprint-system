export interface AttendancePayload {
  employeeCode: string;
  employeeName?: string;
  departmentRaw?: string;
  date: string;
  actualIn: string | null;
  actualOut: string | null;
  actualInRaw?: string | null;
  actualOutRaw?: string | null;
}

export interface ApiResponse<T> {
  data: T;
  isSuccess: boolean;
  errorCode: string;
  message: string;
}

export interface AttendanceStatusPayload {
  status: string;
   note: string;
}

export interface AttendanceTimePayload {
  actualIn: string | null;
  actualOut: string | null;
  note: string;
}

export interface FingerprintPunch {
  employeeCode: string;
  date: string;
  time: string;
}
