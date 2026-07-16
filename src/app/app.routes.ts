import { Routes } from '@angular/router';

import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { EmployeesComponent } from './pages/employees/component/employees.component';
import { AttendanceComponent } from './pages/attendance/component/attendance.component';
import { LoginComponent } from '../app/auth/Components/login/login.component';
import { FingerprintSheetComponent } from './pages/fingerprint-sheet/component/fingerprint-sheet.component';

// ✅ المسارات الصحيحة والدقيقة 100% متوافقة مع مجلدات مشروعك الفعلي:
import { EmployeeFormComponent } from './pages/employees/component/form/employee-form.component'; 
import { EmployeeEditComponent } from './pages/employees/component/edit/employee-edit.component';
import { EmployeeDetailsComponent } from './pages/employees/component/details/employee-details.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },

  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      {
        path: 'employees',
        children: [
          {
            path: '', 
            component: EmployeesComponent
          },
          {
            path: 'add', 
            component: EmployeeFormComponent // ✅ نستخدم نفس مكون الفورم المشترك للإضافة مباشرة
          },
          {
            path: 'edit/:id', 
            component: EmployeeEditComponent
          },
          {
            path: 'details/:id', 
            component: EmployeeDetailsComponent
          }
        ]
      },
      {
        path: 'attendance',
        component: AttendanceComponent
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports/component/reports.component').then(
            (m) => m.ReportsComponent
          )
      },
      {
        path: 'fingerprint-sheet',
        component: FingerprintSheetComponent
      },
      {
        path: '',
        redirectTo: 'employees',
        pathMatch: 'full'
      }
    ]
  },

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];