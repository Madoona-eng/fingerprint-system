import { Routes } from '@angular/router';
import { LoginComponent } from './auth/Components/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component'; // <-- السطر ده هيتضاف تلقائي أو ضيفيه

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // ربط مسار الـ dashboard بالكامبوننت الجديد
  { path: 'dashboard', component: DashboardComponent } 
];