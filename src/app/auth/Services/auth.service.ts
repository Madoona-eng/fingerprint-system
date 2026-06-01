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
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('userName', response.data.userName);
          localStorage.setItem('role', response.data.role);
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
    return localStorage.getItem('role');
  }

  // ميثود تسجيل الخروج
  logout(): void {
    localStorage.clear();
  }
}