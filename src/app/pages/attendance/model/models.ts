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

export interface EmployeeLateSummaryRow {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  from: string;
  to: string;
  totalLateMinutes: number;
  exceedsThreshold: boolean;
}

export interface AttendanceNoteDto {
  id: number;
  content: string;
  displayName: string;
  createdAt: string;
}

export interface AttendanceNoteEntry {
  content: string;
  displayName?: string;
  createdAt?: string;
}

export interface DailyAttendanceRowDto {
  id: number;
  date: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  status: string;
  scheduleIn: string;
  scheduleOut: string;
  graceTime: string;
  actualIn: string | null;
  actualOut: string | null;
  lateMinutes: number | null;
  overtimeMinutes: number | null;
  workedMinutes: number | null;
  isManualOverride: boolean;
  needsReview: boolean;
  isReviewed: boolean;
  reviewedByUserName: string | null;
  notesCount: number;
  createdByUserName: string | null;
  lastModifiedByUserName: string | null;
  lastModifiedAt: string | null;
  reviewedAt: string | null;
}