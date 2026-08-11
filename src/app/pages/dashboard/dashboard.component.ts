import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  userName = localStorage.getItem('userName') || 'مستخدمة النظام';
  userRole = localStorage.getItem('userRole') || 'Admin';
  isSidebarCollapsed = false;
  hideFingerprintSheet = this.isTechnicalAdminRole(this.userRole);

  constructor(private router: Router) {}

  private isTechnicalAdminRole(role: string | null): boolean {
    return (role || '').trim().toLowerCase() === 'technicaladmin';
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}