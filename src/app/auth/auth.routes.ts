import { Routes } from '@angular/router';
import { LoginComponent } from '../auth/Components/login/login.component';

export const routes: Routes = [
  // لو عايزة صفحة اللوجن تفتح أول ما المشروع يشتغل علطول
  { path: '', redirectTo: 'login', pathMatch: 'full' }, 
  { path: 'login', component: LoginComponent },
  
  // باقي مسارات مشروعك...
];