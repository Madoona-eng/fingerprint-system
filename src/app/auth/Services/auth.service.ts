import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

// تعريف الـ Interfaces في نفس الملف أو يمكنك نقلها لملف منفصل لاحقاً
export interface LoginDto {
  userName: string;
  password: string;
}

export interface LoginResponseData {
  userName: string;
  role: string;
  token: string;
  accessTokenExpiresAt: string;
}

export interface ApiResponse<T> {
  data: T;
  isSuccess: boolean;
  errorCode: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // الرابط الخاص بالـ API الموضح في الصور السابقة
  private apiUrl = 'https://civil-protect.minya.gov.eg:1089/api/Account/login';

  constructor(private http: HttpClient) { }

  // ميثود إرسال طلب تسجيل الدخول
  login(credentials: LoginDto): Observable<ApiResponse<LoginResponseData>> {
    return this.http.post<ApiResponse<LoginResponseData>>(this.apiUrl, credentials).pipe(
      tap(response => {
        // إذا كان الطلب ناجحاً، نقوم بتخزين البيانات الأساسية في الـ localStorage
        if (response.isSuccess && response.data) {
          const role = response.data.role;
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('userName', response.data.userName);
          localStorage.setItem('role', role);
          localStorage.setItem('userRole', role);
          localStorage.setItem('expiresAt', response.data.accessTokenExpiresAt);
        }
      })
    );
  }

  // ميثود للتحقق من أن المستخدم مسجل دخول حالياً
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // ميثود لجلب صلاحية المستخدم الحالية (مثل SuperAdmin)
  getUserRole(): string | null {
    const storedRole = localStorage.getItem('role') || localStorage.getItem('userRole');

    if (storedRole) {
      return storedRole.trim();
    }

    const token = localStorage.getItem('token');
    const role = this.extractRoleFromToken(token);

    if (role) {
      localStorage.setItem('role', role);
    }

    return role;
  }

  getUserLocationId(): number | null {
    const storedLocationId = Number(localStorage.getItem('locationId'));

    if (Number.isFinite(storedLocationId) && storedLocationId > 0) {
      return storedLocationId;
    }

    const token = localStorage.getItem('token');
    const locationId = this.extractLocationIdFromToken(token);

    if (locationId !== null) {
      localStorage.setItem('locationId', String(locationId));
    }

    return locationId;
  }

  getUserName(): string | null {
    const storedUserName = localStorage.getItem('userName');
    return storedUserName ? storedUserName.trim() : null;
  }

  private extractRoleFromToken(token: string | null): string | null {
    const decodedPayload = this.decodeTokenPayload(token);

    if (!decodedPayload) {
      return null;
    }

    const role = decodedPayload?.role ?? decodedPayload?.Role;

    if (typeof role === 'string' && role.trim()) {
      return role.trim();
    }

    const roleClaimKey = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
    const roleFromClaim = decodedPayload?.[roleClaimKey];

    if (typeof roleFromClaim === 'string' && roleFromClaim.trim()) {
      return roleFromClaim.trim();
    }

    return null;
  }

  private extractLocationIdFromToken(token: string | null): number | null {
    const decodedPayload = this.decodeTokenPayload(token);

    if (!decodedPayload) {
      return null;
    }

    const locationId = Number(decodedPayload?.LocationId ?? decodedPayload?.locationId);

    return Number.isFinite(locationId) && locationId > 0 ? locationId : null;
  }

  private decodeTokenPayload(token: string | null): any | null {
    if (!token) {
      return null;
    }

    const parts = token.split('.');

    if (parts.length < 2) {
      return null;
    }

    try {
      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const normalized = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
      return JSON.parse(atob(normalized));
    } catch {
      return null;
    }
  }

  // ميثود تسجيل الخروج
  logout(): void {
    localStorage.clear();
  }
}