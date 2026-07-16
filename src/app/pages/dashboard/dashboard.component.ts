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

  constructor(private router: Router) {}

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}