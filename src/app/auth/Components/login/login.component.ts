import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// 1. تصحيح المسار بالرجوع خطوتين للخلف (../../) للوصول لفولدر الـ Services
import { AuthService, ApiResponse, LoginResponseData } from '../../Services/auth.service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService, // سيتم التعرف عليه الآن بنجاح بعد تعديل المسار
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      userName: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      // 2. تحديد نوع الـ response صراحةً لمنع خطأ الـ any
      next: (response: ApiResponse<LoginResponseData>) => {
        this.isLoading = false;
        if (response.isSuccess) {
          console.log('Login successful:', response.message);

          if (response.data?.role) {
            localStorage.setItem('role', response.data.role);
            localStorage.setItem('userRole', response.data.role);
          }

          // توجيه جميع المستخدمين إلى لوحة التحكم الرئيسية.
          // إذا أردت تخصيص طريق حسب الدور، اضف هنا شرط آخر.
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = response.message;
        }
      },
      // 3. تحديد نوع الـ err صراحةً (any) لمنع خطأ الـ any
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'حدث خطأ أثناء الاتصال بالسيرفر، برجاء المحاولة لاحقاً';
        console.error(err);
      }
    });
  }
}