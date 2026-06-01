import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
  // لو لقيتي styleUrls مكتوبة styleUrl (مفرد) في النسخ الجديدة سيبيها زي ما هي
})
export class DashboardComponent implements OnInit {
  userName: string | null = '';
  userRole: string | null = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // جلب البيانات اللي حفظناها في الـ AuthService أثناء الـ Login
    this.userName = localStorage.getItem('userName');
    this.userRole = localStorage.getItem('role');
  }

  logout(): void {
    localStorage.clear(); // مسح الـ Token والبيانات
    this.router.navigate(['/login']); // الرجوع لصفحة اللوجن
  }
}