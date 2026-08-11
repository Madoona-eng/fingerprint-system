import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/Services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  userName = localStorage.getItem('userName') || 'مستخدمة النظام';
  isSidebarCollapsed = false;
  showFingerprintSheet = false;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.userName = this.authService.getUserName() || localStorage.getItem('userName') || 'مستخدمة النظام';
    this.refreshRoleState();
  }

  get userRole(): string {
    const role = localStorage.getItem('role') || localStorage.getItem('userRole') || this.authService.getUserRole() || 'Admin';
    return (role || 'Admin').toString().trim();
  }

  private refreshRoleState(): void {
    const role = this.userRole;
    this.showFingerprintSheet = role.toLowerCase() === 'superadmin';
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}