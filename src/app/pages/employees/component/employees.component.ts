import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { read, utils, writeFile, WorkBook, WorkSheet } from 'xlsx';
import { firstValueFrom } from 'rxjs';

import { EmployeesService } from '../service/employees.service';
import { AuthService } from '../../../auth/Services/auth.service';
import {
  Employee,
  EmployeePayload,
  UpdateEmployeePayload,
  BulkImportEmployeePayload
} from '../model/models';
import { EmployeesListComponent } from './list/employees-list.component';
import { EmployeeFormComponent } from './form/employee-form.component';
import { EmployeeEditComponent } from './edit/employee-edit.component';
import { EmployeeDetailsComponent } from './details/employee-details.component';
import { EmployeeDeleteModalComponent } from './delete/employee-delete-modal.component';
import { EmployeeNoteModalComponent } from './note/employee-note-modal.component';

interface UnknownDepartment {
  key: string;
  name: string;
  id: number | null;
  
}
type EmployeePage = 'upload' | 'list' | 'form' | 'edit' | 'details' | 'analytics';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    EmployeesListComponent,
    EmployeeFormComponent,
    EmployeeEditComponent,
    EmployeeDetailsComponent,
    EmployeeDeleteModalComponent,
    EmployeeNoteModalComponent
  ],
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.css']
})
export class EmployeesComponent implements OnInit {
  employees: Employee[] = [];
  employeeForm!: FormGroup;

  isLoading = false;
  isSaving = false;
  isImporting = false;
  hasImportedCurrentSheet = false;

  searchTerm = '';
  departmentId: number | null = null;
  pageNumber = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  errorMessage = '';
  successMessage = '';
  pendingDeleteId: number | null = null;
  showDeleteModal = false;
  deleteTargetEmployee: Employee | null = null;
  deleteModalMessage = '';

  showNoteModal = false;
  noteTargetEmployee: Employee | null = null;
  noteModalEmployeeName = '';

  selectedEmployeeId: number | null = null;

  selectedEmployeeForDetails: Employee | null = null;
  employeeDetailsRows: any[] = [];

employeeDetailsRaw: any = null;
employeeDetailsInfo: any = null;

  isLoadingEmployeeDetails = false;

  employeeDetailsFrom = '';
  employeeDetailsTo = '';
  employeeDetailsFromDisplay = '';
  employeeDetailsToDisplay = '';
  employeeDetailsPageNumber = 1;
  employeeDetailsPageSize = 10;
  employeeDetailsTotalCount = 0;
  employeeDetailsTotalPages = 0;
  employeeDetailsStatusFilter = '';
  employeeDetailsStatusOptions = [
    { value: '', label: 'كل الحالات' },
    { value: 'present', label: 'حاضر' },
    { value: 'absent', label: 'غائب' },
    { value: 'late', label: 'متأخر' },
    { value: 'earlydeparture', label: 'انصراف مبكر' },
    { value: 'ontime', label: 'في الميعاد' }
  ];
  private employeeDetailsAllRows: any[] = [];

  activeEmployeePage: EmployeePage = 'upload';

  excelEmployees: Employee[] = [];
  excelFileName = '';
  excelErrorMessage = '';
  excelSuccessMessage = '';
  analyticsDate = '';
analyticsDateDisplay = '';

isLoadingEmployeesAnalytics = false;
employeesAnalyticsErrorMessage = '';
employeesAnalyticsSuccessMessage = '';

employeesAnalyticsRaw: any = null;
employeesAnalyticsRows: any[] = [];

analyticsStats = {
  total: 0,
  present: 0,
  absent: 0,
  late: 0,
  earlyDeparture: 0,
  needsReview: 0,
  reviewed: 0
};

analyticsDepartmentRows: any[] = [];
  excelRowErrors: string[] = [];

  bulkImportResults: any[] = [];
  bulkImportErrors: any[] = [];
  missingDepartmentNames: string[] = [];

  unknownDepartments: UnknownDepartment[] = [];

  departmentMap: Record<string, number> = {
    'ادارة الازمات': 1,
    'الاتصال السياسي': 2,
    'الموارد البشرية': 1,
    'تكنولوجيا المعلومات': 2
  };
  locationOptions: { id: number; name: string }[] = [];
  selectedLocationId: number | null = null;

  departmentOptions: { id: number; name: string }[] = [
  { id: 1, name: 'إدارة الأزمات' },
  { id: 2, name: 'الاتصال السياسي' },
  { id: 3, name: 'الإدارة العامة للتنمية' },
  { id: 4, name: 'الاستثمار' },
  { id: 5, name: 'الإسكان' },
  { id: 6, name: 'الاعلام' },
  { id: 7, name: 'الإعلانات' },
  { id: 8, name: 'الأمن' },
  { id: 9, name: 'الأمومة والطفولة' },
  { id: 10, name: 'التخطيط العمراني' },
  { id: 11, name: 'التخطيط والمتابعة' },
  { id: 12, name: 'التنمية الحضارية' },
  { id: 13, name: 'التوريدات' },
  { id: 14, name: 'الحجز الإداري' },
  { id: 15, name: 'الحسابات' },
  { id: 16, name: 'الحوكمة' },
  { id: 17, name: 'الخزينة' },
  { id: 18, name: 'الرصد الإعلامي' },
  { id: 19, name: 'السياحة' },
  { id: 20, name: 'الشؤون الإدارية' },
  { id: 21, name: 'الشؤون القانونية' },
  { id: 22, name: 'الشؤون المالية' },
  { id: 23, name: 'الصندوق التأميني' },
  { id: 24, name: 'العلاقات الدولية' },
  { id: 25, name: 'العلاقات العامة' },
  { id: 26, name: 'المتغيرات المكانية' },
  { id: 27, name: 'المخازن' },
  { id: 28, name: 'المركبات' },
  { id: 29, name: 'المكتب الفني' },
  { id: 30, name: 'الموارد البشرية' },
  { id: 31, name: 'الهيئة الموازنية' },
  { id: 32, name: 'ترشيد الطاقة' },
  { id: 33, name: 'حساب الخدمات' },
  { id: 34, name: 'خدمة المواطنين' },
  { id: 35, name: 'شؤون المجالس' },
  { id: 36, name: 'شؤون المقر' },
  { id: 37, name: 'صندوق الخدمات' },
  { id: 38, name: 'فض المنازعات' },
  { id: 39, name: 'مكتب الإعلام' },
  { id: 40, name: 'مكتب المستشار القضائي' },
  { id: 41, name: 'مكتب مفوض الدولة' }
];
getDepartmentNameById(id: number | null | undefined): string {
  if (!id) {
    return '';
  }

  return this.departmentOptions.find((dep) => dep.id === Number(id))?.name || '';
}

  formatWorkedHours(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const totalMinutes = Number(value);

    if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
      return '-';
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} دقيقة`;
    }

    if (minutes === 0) {
      return `${hours} ساعة`;
    }

    return `${hours} ساعة و ${minutes} دقيقة`;
  }

  getStatusLabel(status: unknown): string {
    const value = String(status ?? '').trim();

    if (!value) {
      return '-';
    }

    const normalized = value.toLowerCase();

    const translations: Record<string, string> = {
      present: 'حاضر',
      absent: 'غائب',
      late: 'متأخر',
      earlydeparture: 'انصراف مبكر',
      early_departure: 'انصراف مبكر',
      overtime: 'إضافي',
      ontime: 'في الميعاد',
      'في الميعاد': 'في الميعاد',
      حاضر: 'حاضر',
      غائب: 'غائب',
      متأخر: 'متأخر',
      'انصراف مبكر': 'انصراف مبكر'
    };

    return translations[normalized] || value;
  }

  getNoteLabel(notes: string | null | undefined): string {
    const value = String(notes || '').trim();
    if (!value) {
      return '-';
    }

    const lowerValue = value.toLowerCase();

    if (
      lowerValue.includes('checkin without checkout') ||
      lowerValue.includes('checkout without checkin')
    ) {
      return 'دخول بدون خروج - يحتاج مراجعة';
    }

    if (lowerValue.includes('needs review')) {
      return 'يحتاج مراجعة';
    }

    return value;
  }

  databaseDepartmentNames: string[] = [
    'إدارة الأزمات',
    'الاتصال السياسي',
    'الإدارة العامة للتنمية',
    'الاستثمار',
    
    'الإسكان',
    'الإعلانات',
    'الأمن',
    'الأمومة والطفولة',
    'التخطيط العمراني',
    'التخطيط والمتابعة',
    'التنمية الحضارية',
    'التوريدات',
    'الحجز الإداري',
    'الحسابات',
    'الحوكمة',
    'الخزينة',
    'الرصد الإعلامي',
    'السياحة',
    'الشؤون الإدارية',
    'الشؤون المالية',
    'الشؤون القانونية',
    'الصندوق التأميني',
    'العلاقات الدولية',
    'العلاقات العامة',
    'المتغيرات المكانية',
    'المخازن',
    'المركبات',
    'المكتب الفني',
    'الموارد البشرية',
    'الهيئة الموازنية',
    'ترشيد الطاقة',
    'حساب الخدمات',
    'خدمة المواطنين',
    'شؤون المجالس',
    'شؤون المقر',
    'صندوق الخدمات',
    'فض المنازعات',
    'مكتب الإعلام',
    'مكتب المستشار القضائي',
    'مكتب مفوض الدولة'
  ];

  departmentAliases: Record<string, string> = {
    'ادارة الازمات': 'إدارة الأزمات',
    'ادارة الأزمات': 'إدارة الأزمات',
    'إدارة الازمات': 'إدارة الأزمات',
    'إدارة الأزمات': 'إدارة الأزمات',

    'الاتصال السياسي': 'الاتصال السياسي',
    'الاتصال السياسى': 'الاتصال السياسي',

    'الادارة العامة للتنمية': 'الإدارة العامة للتنمية',
    'الإدارة العامة للتنمية': 'الإدارة العامة للتنمية',

    'الاستثمار': 'الاستثمار',

    'الاسكان': 'الإسكان',
    'الإسكان': 'الإسكان',

    'الاعلانات': 'الإعلانات',
    'الإعلانات': 'الإعلانات',

    'الامن': 'الأمن',
    'الأمن': 'الأمن',

    'الامومة و الطفولة': 'الأمومة والطفولة',
    'الأمومة و الطفولة': 'الأمومة والطفولة',
    'الامومة والطفولة': 'الأمومة والطفولة',
    'الأمومة والطفولة': 'الأمومة والطفولة',

    'التخطيط العمراني': 'التخطيط العمراني',
    'التخطيط العمرانى': 'التخطيط العمراني',

    'التخطيط و المتابعة': 'التخطيط والمتابعة',
    'التخطيط والمتابعة': 'التخطيط والمتابعة',

    'التنمية الحضارية': 'التنمية الحضارية',

    'التوريدات': 'التوريدات',
    'توريدات': 'التوريدات',

    'الحجز الاداري': 'الحجز الإداري',
    'الحجز الإداري': 'الحجز الإداري',

    'الحسابات': 'الحسابات',
    'حسابات': 'الحسابات',

    'الحوكمة': 'الحوكمة',
    'الخزينة': 'الخزينة',

    'الرصد الاعلامى': 'الرصد الإعلامي',
    'الرصد الإعلامي': 'الرصد الإعلامي',

    'السياحة': 'السياحة',

    'الشون الادارية': 'الشؤون الإدارية',
    'الشون الإدارية': 'الشؤون الإدارية',
    'الشئون الادارية': 'الشؤون الإدارية',
    'الشئون الإدارية': 'الشؤون الإدارية',
    'الشؤون الادارية': 'الشؤون الإدارية',
    'الشؤون الإدارية': 'الشؤون الإدارية',
    'شون ادارية': 'الشؤون الإدارية',
    'شون إدارية': 'الشؤون الإدارية',
    'شئون ادارية': 'الشؤون الإدارية',
    'شئون إدارية': 'الشؤون الإدارية',
    'شؤون ادارية': 'الشؤون الإدارية',
    'شؤون إدارية': 'الشؤون الإدارية',
    'شءون ادارية': 'الشؤون الإدارية',
    'شءون إدارية': 'الشؤون الإدارية',

    'الشئون المالية': 'الشؤون المالية',
    'الشؤون المالية': 'الشؤون المالية',
    'شئون مالية': 'الشؤون المالية',
    'شؤون مالية': 'الشؤون المالية',

    'الشئون القانونية': 'الشؤون القانونية',
    'الشؤون القانونية': 'الشؤون القانونية',
    'شئون قانونية': 'الشؤون القانونية',
    'شؤون قانونية': 'الشؤون القانونية',

    'الصندوق التأميني': 'الصندوق التأميني',
    'الصندوق التاميني': 'الصندوق التأميني',

    'العلاقات الدولية': 'العلاقات الدولية',
    'العلاقات العامة': 'العلاقات العامة',

    'المتغيرات المكانية': 'المتغيرات المكانية',
    'المخازن': 'المخازن',
    'المركبات': 'المركبات',

    'المكتب الفنى': 'المكتب الفني',
    'المكتب الفني': 'المكتب الفني',

    'الموارد البشرية': 'الموارد البشرية',
    'الهيئة الموازنية': 'الهيئة الموازنية',
    'ترشيد الطاقة': 'ترشيد الطاقة',
    'حساب الخدمات': 'حساب الخدمات',
    'خدمة المواطنين': 'خدمة المواطنين',

    'شئون المجالس': 'شؤون المجالس',
    'شؤون المجالس': 'شؤون المجالس',
    'شون المجالس': 'شؤون المجالس',

    'شئون المقر': 'شؤون المقر',
    'شؤون المقر': 'شؤون المقر',
    'شون المقر': 'شؤون المقر',

    'صندوق الخدمات': 'صندوق الخدمات',
    'فض المنازعات': 'فض المنازعات',

    'مكتب الاعلام': 'مكتب الإعلام',
    'مكتب الإعلام': 'مكتب الإعلام',

    'مكتب المستشار القضائى': 'مكتب المستشار القضائي',
    'مكتب المستشار القضائي': 'مكتب المستشار القضائي',

    'مكتب مفوض الدولة': 'مكتب مفوض الدولة'
  };

  constructor(
    private fb: FormBuilder,
    private employeesService: EmployeesService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadLocations();
    this.loadDepartmentOptions();
    this.route.queryParams.subscribe((params) => {
      const requestedPage = String(params['page'] || 'list') as EmployeePage;
      const requestedId = Number(params['id'] || 0);

      if (requestedPage === 'form' || requestedPage === 'edit') {
        this.openEmployeePage(requestedPage, requestedId || null);
        return;
      }

      this.openEmployeePage(requestedPage, null);
    });
    this.loadEmployees();
  }

openEmployeePage(page: EmployeePage, id: number | null = null): void {
  if (page === 'form') {
    this.selectedEmployeeId = null;
    this.employeeForm.reset();
    this.employeeForm.controls['employeeCode'].enable();
    this.errorMessage = '';
    this.successMessage = '';
  }

  if (page === 'edit' && id) {
    this.selectedEmployeeId = id;
  }

  this.activeEmployeePage = page;

  this.router.navigate([], {
    relativeTo: this.route,
    queryParams: {
      page,
      ...(id ? { id } : {})
    },
    queryParamsHandling: 'merge',
    replaceUrl: true
  });

  if (page === 'analytics' && !this.analyticsDateDisplay) {
    this.setTodayAnalyticsDate();
    this.loadEmployeesAnalytics();
  }
}
  initForm(): void {
    this.employeeForm = this.fb.group({
      employeeCode: ['', Validators.required],
      name: ['', Validators.required],
      departmentId: [null, Validators.required],
      locationId: [null],
      scheduleIn: ['', Validators.required],
      scheduleOut: ['', Validators.required],
      graceTime: ['', Validators.required],
      note: ['']
    });
  }

  private loadLocations(): void {
    const role = this.authService.getUserRole();
    const normalizedRole = role?.trim().toLowerCase();

    if (normalizedRole !== 'superadmin' && normalizedRole !== 'technicaladmin') {
      return;
    }

    this.employeesService.getLocations().subscribe({
      next: (response: any) => {
        const locations = this.mapLocationOptions(response);
        this.locationOptions = locations;

        if (locations.length > 0) {
          const userLocationId = this.authService.getUserLocationId();
          this.selectedLocationId = userLocationId ?? locations[0].id;
          this.loadDepartmentOptions(this.selectedLocationId);
        }
      },
      error: () => {
        console.warn('Failed to load locations.');
      }
    });
  }

  private loadDepartmentOptions(locationId: number | null = null): void {
    const role = this.authService.getUserRole();
    const normalizedRole = role?.trim().toLowerCase();

    if (normalizedRole !== 'superadmin' && normalizedRole !== 'technicaladmin') {
      return;
    }

    const resolvedLocationId =
      locationId && locationId > 0
        ? locationId
        : this.authService.getUserLocationId() ?? this.getSuperAdminLocationId();

    this.employeesService.getDepartments(resolvedLocationId).subscribe({
      next: (response: any) => {
        const departments = this.mapDepartmentOptions(response);

        if (departments.length > 0) {
          this.departmentOptions = departments;
          return;
        }

        if (resolvedLocationId !== null) {
          this.employeesService.getDepartments(null).subscribe({
            next: (fallbackResponse: any) => {
              const fallbackDepartments = this.mapDepartmentOptions(fallbackResponse);
              if (fallbackDepartments.length > 0) {
                this.departmentOptions = fallbackDepartments;
              }
            },
            error: () => {
              console.warn('Failed to load departments without location filter.');
            }
          });
        }
      },
      error: () => {
        console.warn('Failed to load departments for the selected location.');
      }
    });
  }

  private getSuperAdminLocationId(): number {
    const storedLocationId = Number(localStorage.getItem('locationId'));

    if (Number.isFinite(storedLocationId) && storedLocationId > 0) {
      return storedLocationId;
    }

    return 2;
  }

  private mapLocationOptions(response: any): Array<{ id: number; name: string }> {
    const payload = response?.data ?? response;
    const source = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.locations)
        ? payload.locations
        : Array.isArray(payload)
          ? payload
          : [];

    return source
      .map((item: any) => {
        const rawId = item?.id ?? item?.locationId ?? item?.value;
        const id = Number(rawId);
        const name = String(item?.name ?? item?.locationName ?? item?.title ?? item?.label ?? '').trim();

        if (!Number.isFinite(id) || id <= 0 || !name) {
          return null;
        }

        return { id, name };
      })
      .filter((item: { id: number; name: string } | null): item is { id: number; name: string } => item !== null);
  }

  private mapDepartmentOptions(response: any): Array<{ id: number; name: string }> {
    const payload = response?.data ?? response;
    const source = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.departments)
        ? payload.departments
        : Array.isArray(payload)
          ? payload
          : [];

    return source
      .map((item: any) => {
        const rawId = item?.id ?? item?.departmentId ?? item?.department?.id ?? item?.value;
        const id = Number(rawId);
        const name = String(
          item?.name ?? item?.departmentName ?? item?.title ?? item?.label ?? item?.department?.name ?? ''
        ).trim();

        if (!Number.isFinite(id) || id <= 0 || !name) {
          return null;
        }

        return { id, name };
      })
      .filter((item: { id: number; name: string } | null): item is { id: number; name: string } => item !== null);
  }

  onLocationChanged(locationId: number | null): void {
    this.selectedLocationId = locationId;
    this.departmentId = null;
    this.pageNumber = 1;
    this.loadDepartmentOptions(locationId);
    this.loadEmployees();
  }

  loadEmployees(): void {
      
      console.log('DepartmentId =', this.departmentId);
  console.log('Search =', this.searchTerm);
    this.isLoading = true;
    this.errorMessage = '';

    this.employeesService
      .getEmployees(
        this.searchTerm,
        this.pageNumber,
        this.pageSize,
        this.departmentId
      )
      .subscribe({
        next: (response: any) => {
          console.log('GET Employees Response (raw):', JSON.stringify(response, null, 2));

          let items: Employee[] = [];

          if (Array.isArray(response?.data?.items)) {
            items = response.data.items;
            this.pageNumber = response.data.pageNumber || 1;
            this.pageSize = response.data.pageSize || this.pageSize;
            this.totalCount = response.data.totalCount || 0;
            this.totalPages = response.data.totalPages || 0;
          } else if (Array.isArray(response?.items)) {
            items = response.items;
          } else if (Array.isArray(response?.data)) {
            items = response.data;
          } else if (Array.isArray(response)) {
            items = response;
          }

          this.employees = (items || []).map((item: any) => this.normalizeEmployeeBooleans(item));

          console.log('Employees resolved from response, length:', this.employees.length);
          console.log(
            'Employees Array (first 10):',
            JSON.stringify(this.employees.slice(0, 10), null, 2)
          );

          this.isLoading = false;
        },
        error: (err) => {
          console.log(err);
          this.employees = [];
          this.errorMessage = 'حدث خطأ أثناء تحميل بيانات الموظفين';
          this.isLoading = false;
        }
      });
  }
  setTodayAnalyticsDate(): void {
  const today = new Date();

  this.analyticsDate = this.analyticsDateToApi(today);
  this.analyticsDateDisplay = this.analyticsDateToDisplay(today);
}

formatAnalyticsDateWhileTyping(): void {
  let value = String(this.analyticsDateDisplay || '')
    .replace(/\D/g, '')
    .slice(0, 8);

  if (value.length > 4) {
    value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
  } else if (value.length > 2) {
    value = `${value.slice(0, 2)}/${value.slice(2)}`;
  }

  this.analyticsDateDisplay = value;
}

loadEmployeesAnalytics(): void {
  const apiDate = this.analyticsDisplayDateToApi(this.analyticsDateDisplay);

  if (!apiDate) {
    this.employeesAnalyticsErrorMessage =
      'من فضلك اكتب التاريخ بطريقة صحيحة مثل: 31/03/2026';
    return;
  }

  this.analyticsDate = apiDate;
  this.analyticsDateDisplay = this.analyticsApiDateToDisplay(apiDate);

  this.isLoadingEmployeesAnalytics = true;
  this.employeesAnalyticsErrorMessage = '';
  this.employeesAnalyticsSuccessMessage = '';

  this.employeesService.getEmployeesSummary(this.analyticsDate).subscribe({
    next: (response: any) => {
      console.log('Employees Summary Response:', response);

      const data = response?.data || response;

      this.employeesAnalyticsRaw = data;
      this.employeesAnalyticsRows = this.extractAnalyticsRows(data);
      this.analyticsStats = this.buildAnalyticsStats(data, this.employeesAnalyticsRows);
      this.analyticsDepartmentRows = this.buildDepartmentAnalyticsRows(
        this.employeesAnalyticsRows
      );

      this.employeesAnalyticsSuccessMessage = 'تم تحميل تحليل البيانات بنجاح';
      this.isLoadingEmployeesAnalytics = false;
    },
    error: (err) => {
      console.log('Employees analytics error:', err);

      this.employeesAnalyticsRaw = null;
      this.employeesAnalyticsRows = [];
      this.analyticsDepartmentRows = [];

      this.analyticsStats = {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        earlyDeparture: 0,
        needsReview: 0,
        reviewed: 0
      };

      this.employeesAnalyticsErrorMessage =
        err?.error?.message ||
        err?.message ||
        'حدث خطأ أثناء تحميل تحليل البيانات';

      this.isLoadingEmployeesAnalytics = false;
    }
  });
}

clearEmployeesAnalytics(): void {
  this.analyticsDate = '';
  this.analyticsDateDisplay = '';
  this.employeesAnalyticsRaw = null;
  this.employeesAnalyticsRows = [];
  this.analyticsDepartmentRows = [];
  this.employeesAnalyticsErrorMessage = '';
  this.employeesAnalyticsSuccessMessage = '';

  this.analyticsStats = {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    earlyDeparture: 0,
    needsReview: 0,
    reviewed: 0
  };
}

get attendancePercent(): number {
  if (!this.analyticsStats.total) return 0;
  return Math.round((this.analyticsStats.present / this.analyticsStats.total) * 100);
}

get latePercent(): number {
  if (!this.analyticsStats.total) return 0;
  return Math.round((this.analyticsStats.late / this.analyticsStats.total) * 100);
}

get absencePercent(): number {
  if (!this.analyticsStats.total) return 0;
  return Math.round((this.analyticsStats.absent / this.analyticsStats.total) * 100);
}

private extractAnalyticsRows(data: any): any[] {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.details)) return data.details;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data)) return data;

  return [];
}

private buildAnalyticsStats(data: any, rows: any[]): any {
  const apiStats = {
    total: this.pickNumber(data, ['total', 'totalEmployees', 'employeeCount', 'count']),
    present: this.pickNumber(data, ['present', 'presentCount', 'totalPresent']),
    absent: this.pickNumber(data, ['absent', 'absentCount', 'totalAbsent']),
    late: this.pickNumber(data, ['late', 'lateCount', 'totalLate']),
    earlyDeparture: this.pickNumber(data, [
      'earlyDeparture',
      'earlyDepartureCount',
      'totalEarlyDeparture'
    ]),
    needsReview: this.pickNumber(data, ['needsReview', 'needsReviewCount']),
    reviewed: this.pickNumber(data, ['reviewed', 'reviewedCount'])
  };

  const hasApiStats = Object.values(apiStats).some((value) => value > 0);

  if (hasApiStats) {
    return apiStats;
  }

  const stats = {
    total: rows.length,
    present: 0,
    absent: 0,
    late: 0,
    earlyDeparture: 0,
    needsReview: 0,
    reviewed: 0
  };

  rows.forEach((row: any) => {
    const status = String(
      row.status || row.attendanceStatus || row.todayStatus || ''
    ).trim();

    const notes = String(row.notes || '').toLowerCase();

    if (status === 'Present') {
      stats.present++;
    } else if (status === 'Absent') {
      stats.absent++;
    } else if (status === 'Late') {
      stats.late++;
    } else if (status === 'EarlyDeparture') {
      stats.earlyDeparture++;
    }

    if (
      notes.includes('needs review') ||
      notes.includes('يحتاج مراجعة') ||
      status === 'Incomplete' ||
      status === 'MissingIn' ||
      status === 'MissingOut'
    ) {
      stats.needsReview++;
    }

    if (
      row.isReviewed === true ||
      row.reviewed === true ||
      notes.includes('reviewed') ||
      notes.includes('تمت المراجعة')
    ) {
      stats.reviewed++;
    }
  });

  return stats;
}

private buildDepartmentAnalyticsRows(rows: any[]): any[] {
  const map = new Map<string, any>();

  rows.forEach((row: any) => {
    const departmentName =
      row.departmentName ||
      row.employee?.departmentName ||
      row.department?.name ||
      'غير محدد';

    const status = String(
      row.status || row.attendanceStatus || row.todayStatus || ''
    ).trim();

    if (!map.has(departmentName)) {
      map.set(departmentName, {
        departmentName,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        earlyDeparture: 0
      });
    }

    const item = map.get(departmentName);

    item.total++;

    if (status === 'Present') {
      item.present++;
    } else if (status === 'Absent') {
      item.absent++;
    } else if (status === 'Late') {
      item.late++;
    } else if (status === 'EarlyDeparture') {
      item.earlyDeparture++;
    }
  });

  return Array.from(map.values());
}

private pickNumber(data: any, keys: string[]): number {
  for (const key of keys) {
    const value = Number(data?.[key]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

private analyticsDateToApi(date: Date): string {
  const year = date.getFullYear();
  const month = this.analyticsPad(date.getMonth() + 1);
  const day = this.analyticsPad(date.getDate());

  return `${year}-${month}-${day}`;
}

private analyticsDateToDisplay(date: Date): string {
  const day = this.analyticsPad(date.getDate());
  const month = this.analyticsPad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

private analyticsDisplayDateToApi(displayDate: string): string {
  const text = String(displayDate || '').trim();

  if (!text) return '';

  const normalizedText = text.replace(/[.\-]/g, '/');

  let day = 0;
  let month = 0;
  let year = 0;

  const slashMatch = normalizedText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    day = Number(slashMatch[1]);
    month = Number(slashMatch[2]);
    year = Number(slashMatch[3]);
  } else {
    const digits = normalizedText.replace(/\D/g, '');

    if (!/^\d{8}$/.test(digits)) {
      return '';
    }

    day = Number(digits.slice(0, 2));
    month = Number(digits.slice(2, 4));
    year = Number(digits.slice(4, 8));
  }

  const date = new Date(year, month - 1, day);

  const isValidDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValidDate) return '';

  return `${year}-${this.analyticsPad(month)}-${this.analyticsPad(day)}`;
}

private analyticsApiDateToDisplay(apiDate: string): string {
  if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) {
    return '';
  }

  const [year, month, day] = apiDate.split('-');

  return `${day}/${month}/${year}`;
}

private analyticsPad(value: number): string {
  return value.toString().padStart(2, '0');
}

openEmployeeDetailsDatePicker(input: HTMLInputElement): void {
  if ((input as any).showPicker) {
    (input as any).showPicker();
    return;
  }

  input.click();
}

onEmployeeDetailsNativeDatePicked(event: Event, field: 'from' | 'to'): void {
  const input = event.target as HTMLInputElement;
  const apiDate = input.value; // YYYY-MM-DD

  if (!apiDate) {
    return;
  }

  if (field === 'from') {
    this.employeeDetailsFrom = apiDate;
    this.employeeDetailsFromDisplay = this.employeeDetailsApiDateToDisplay(apiDate);
  } else {
    this.employeeDetailsTo = apiDate;
    this.employeeDetailsToDisplay = this.employeeDetailsApiDateToDisplay(apiDate);
  }
}

  onEmployeeDetailsDateInputChanged(event: { field: 'from' | 'to'; value: string }): void {
    if (event.field === 'from') {
      this.employeeDetailsFromDisplay = event.value;
    } else {
      this.employeeDetailsToDisplay = event.value;
    }
  }

  private employeeDetailsApiDateToDisplay(apiDate: string): string {
  if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) {
    return '';
  }

  const [year, month, day] = apiDate.split('-');

  return `${day}/${month}/${year}`;
}
openEmployeeDetails(employee: Employee): void {
  if (!employee.id) {
    this.errorMessage = 'لا يمكن عرض تفاصيل هذا الموظف لأن رقم ID غير موجود';
    return;
  }

  this.selectedEmployeeForDetails = employee;
  this.employeeDetailsPageNumber = 1;
  this.employeeDetailsRows = [];
  this.employeeDetailsAllRows = [];
  this.employeeDetailsRaw = null;
  this.employeeDetailsInfo = null;
  this.errorMessage = '';
  this.successMessage = '';

  this.activeEmployeePage = 'details';

  this.loadEmployeeDetails();
}

 loadEmployeeDetails(): void {
  const employeeId = this.selectedEmployeeForDetails?.id;

  if (!employeeId) {
    this.errorMessage = 'قم بإختيار موظف أولًا لعرض التفاصيل';
    return;
  }

  this.isLoadingEmployeeDetails = true;
  this.errorMessage = '';

  this.employeesService
    .getEmployeeById(
      employeeId,
      this.employeeDetailsFrom,
      this.employeeDetailsTo,
      this.employeeDetailsPageNumber,
      this.employeeDetailsPageSize
    )
    .subscribe({
      next: (response: any) => {
        console.log('Employee Details Response:', response);

        const data = response?.data || response;

        this.selectedEmployeeForDetails = this.normalizeEmployeeBooleans({
          ...(this.selectedEmployeeForDetails || {}),
          ...data
        });

        this.employeeDetailsRaw = data;
        this.employeeDetailsInfo = data;

        const attendanceData =
          data?.attendance ||
          data?.attendances ||
          data?.attendanceData ||
          null;

        let rows: any[] = [];

        if (attendanceData?.items && Array.isArray(attendanceData.items)) {
          rows = attendanceData.items;
          this.employeeDetailsPageNumber = attendanceData.pageNumber || 1;
          this.employeeDetailsPageSize =
            attendanceData.pageSize || this.employeeDetailsPageSize;
          this.employeeDetailsTotalCount = attendanceData.totalCount || 0;
          this.employeeDetailsTotalPages = attendanceData.totalPages || 0;
        } else if (Array.isArray(attendanceData)) {
          rows = attendanceData;
          this.employeeDetailsTotalCount = attendanceData.length;
          this.employeeDetailsTotalPages = 1;
        } else {
          rows = [];
          this.employeeDetailsTotalCount = 0;
          this.employeeDetailsTotalPages = 0;
        }

        this.employeeDetailsAllRows = rows;
        this.applyEmployeeDetailsStatusFilter();
        this.isLoadingEmployeeDetails = false;
      },
      error: (err) => {
        console.log('Get employee details error:', err);

        this.employeeDetailsRows = [];
        this.employeeDetailsRaw = null;
        this.employeeDetailsInfo = null;

        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'حدث خطأ أثناء تحميل تفاصيل الموظف';

        this.isLoadingEmployeeDetails = false;
      }
    });
}

  applyEmployeeDetailsDateFilter(): void {
    this.employeeDetailsFrom = this.formatEmployeeDetailsDateToApi(
      this.employeeDetailsFromDisplay
    );
    this.employeeDetailsTo = this.formatEmployeeDetailsDateToApi(
      this.employeeDetailsToDisplay
    );
    this.employeeDetailsPageNumber = 1;
    this.loadEmployeeDetails();
  }

  onEmployeeDetailsStatusChange(): void {
    this.applyEmployeeDetailsStatusFilter();
  }

  clearEmployeeDetailsDateFilter(): void {
    this.employeeDetailsFrom = '';
    this.employeeDetailsTo = '';
    this.employeeDetailsFromDisplay = '';
    this.employeeDetailsToDisplay = '';
    this.employeeDetailsPageNumber = 1;
    this.loadEmployeeDetails();
  }

  private applyEmployeeDetailsStatusFilter(): void {
    if (!this.employeeDetailsStatusFilter) {
      this.employeeDetailsRows = [...this.employeeDetailsAllRows];
      return;
    }

    const selectedStatus = this.normalizeEmployeeDetailsStatus(
      this.employeeDetailsStatusFilter
    );

    this.employeeDetailsRows = this.employeeDetailsAllRows.filter((row) => {
      const rowStatus = this.normalizeEmployeeDetailsStatus(row?.status);
      return rowStatus === selectedStatus;
    });
  }

  private normalizeEmployeeDetailsStatus(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[_\s-]+/g, '');
  }

  formatEmployeeDetailsDateWhileTyping(field: 'from' | 'to'): void {
    const currentValue =
      field === 'from'
        ? this.employeeDetailsFromDisplay
        : this.employeeDetailsToDisplay;

    const normalized = String(currentValue || '')
      .replace(/\D/g, '')
      .slice(0, 8);

    const formatted =
      normalized.length > 4
        ? `${normalized.slice(0, 2)}/${normalized.slice(2, 4)}/${normalized.slice(4)}`
        : normalized.length > 2
          ? `${normalized.slice(0, 2)}/${normalized.slice(2)}`
          : normalized;

    if (field === 'from') {
      this.employeeDetailsFromDisplay = formatted;
    } else {
      this.employeeDetailsToDisplay = formatted;
    }
  }

  private formatEmployeeDetailsDateToApi(value: string): string {
    const digits = String(value || '').replace(/\D/g, '');

    if (digits.length !== 8) {
      return '';
    }

    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    return `${year}-${month}-${day}`;
  }

  nextEmployeeDetailsPage(): void {
    if (this.employeeDetailsPageNumber < this.employeeDetailsTotalPages) {
      this.employeeDetailsPageNumber++;
      this.loadEmployeeDetails();
    }
  }

  previousEmployeeDetailsPage(): void {
    if (this.employeeDetailsPageNumber > 1) {
      this.employeeDetailsPageNumber--;
      this.loadEmployeeDetails();
    }
  }

 backToEmployeesList(): void {
  this.activeEmployeePage = 'list';
  this.selectedEmployeeForDetails = null;
  this.employeeDetailsRows = [];
  this.employeeDetailsRaw = null;
  this.employeeDetailsInfo = null;
  this.loadEmployees();
}

  searchEmployees(): void {
    this.pageNumber = 1;
    this.loadEmployees();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.departmentId = null;
    this.pageNumber = 1;
    this.loadEmployees();
  }

  nextPage(): void {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadEmployees();
    }
  }

  previousPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadEmployees();
    }
  }

  async exportEmployeesListToExcel(): Promise<void> {
    const exportPageSize = 1000;
    const allEmployees: any[] = [];

    let page = 1;
    let totalPages = 1;

    try {
      while (page <= totalPages) {
        const resp: any = await firstValueFrom(
          this.employeesService.getEmployees(
            this.searchTerm || '',
            page,
            exportPageSize,
            this.departmentId
          )
        );

        const data = resp?.data ?? resp;

        let items: any[] = [];

        if (Array.isArray(data?.items)) {
          items = data.items;
          totalPages = data.totalPages || 1;
        } else if (Array.isArray(data)) {
          items = data;
          totalPages = 1;
        }

        allEmployees.push(...items);
        page++;
      }
    } catch (err) {
      console.error('Failed to fetch all employees for export', err);
      this.errorMessage = 'فشل تصدير ملف Excel';
      return;
    }

    if (allEmployees.length === 0) {
      this.errorMessage = 'لا توجد بيانات موظفين للتصدير';
      return;
    }

    const exportData = allEmployees.map((emp) => ({
      الكود: emp.employeeCode || '-',
      الاسم: emp.name || '-',
      القسم: emp.departmentName || emp.departmentId || '-',
      'رقم اللوكيشن': emp.locationId != null ? emp.locationId : '-',
      'وقت الحضور': this.timeForInput(emp.scheduleIn),
      'وقت الانصراف': this.timeForInput(emp.scheduleOut),
      'وقت السماح': this.timeForInput(emp.graceTime)
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook: WorkBook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'موظفين');
    writeFile(workbook, `employees-${this.analyticsDateDisplay || 'list'}.xlsx`);
  }

  exportEmployeeDetailsToExcel(): void {
    if (!this.employeeDetailsRows || this.employeeDetailsRows.length === 0) {
      this.errorMessage = 'لا توجد بيانات تفاصيل للتصدير';
      return;
    }

    const exportData = this.employeeDetailsRows.map((row) => ({
      التاريخ: row.date || row.attendanceDate || row.from || '-',
      'وقت الحضور': row.actualIn || row.checkIn || row.in || '-',
      'وقت الانصراف': row.actualOut || row.checkOut || row.out || '-',
      'معاد الحضور': row.scheduleIn || row.attendanceScheduleIn || '-',
      'معاد الانصراف': row.scheduleOut || row.attendanceScheduleOut || '-',
      'وقت السماح': row.graceTime || row.attendanceGraceTime || '-',
      'ساعات العمل': this.formatWorkedHours(row.workedMinutes),
      'دقائق التأخير': row.lateMinutes != null ? row.lateMinutes : '-',
      'دقائق الإضافي': row.overtimeMinutes != null ? row.overtimeMinutes : '-',
      الحالة: this.getStatusLabel(row.status),
      الملاحظات: this.getNoteLabel(row.notes)
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook: WorkBook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'تفاصيل الموظف');
    writeFile(workbook, `employee-details-${this.selectedEmployeeForDetails?.employeeCode || 'details'}.xlsx`);
  }
  
  showDeleteConfirmation(emp: Employee): void {
    this.openDeleteModal(emp);
  }

  openNoteModal(emp: Employee): void {
    if (!emp || !emp.id) {
      this.errorMessage = 'لا يمكن إضافة ملاحظة لهذا الموظف لأن معرفه غير متوفر';
      return;
    }

    this.noteTargetEmployee = emp;
    this.noteModalEmployeeName = emp.name || emp.employeeCode || 'الموظف';
    this.showNoteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelNoteModal(): void {
    this.showNoteModal = false;
    this.noteTargetEmployee = null;
    this.noteModalEmployeeName = '';
  }

  confirmAddEmployeeNote(content: string): void {
    const id = this.noteTargetEmployee?.id;

    if (!id) {
      this.errorMessage = 'لم يتم تحديد موظف لإضافة الملاحظة';
      this.showNoteModal = false;
      return;
    }

    const trimmed = content?.trim();
    if (!trimmed) {
      this.errorMessage = 'نص الملاحظة مطلوب';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.employeesService.addEmployeeNote(id, trimmed).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        this.showNoteModal = false;
        this.noteTargetEmployee = null;
        this.noteModalEmployeeName = '';

        if (response?.isSuccess === false) {
          this.errorMessage = response?.message || 'فشل إضافة الملاحظة';
          return;
        }

        this.successMessage = response?.message || 'تمت إضافة الملاحظة بنجاح';
        this.loadEmployees();
      },
      error: (err) => {
        this.isSaving = false;
        this.showNoteModal = false;
        this.noteTargetEmployee = null;
        this.noteModalEmployeeName = '';
        this.errorMessage = err?.error?.message || err?.message || 'حدث خطأ أثناء إضافة الملاحظة';
      }
    });
  }

  deleteEmployeeNote(noteId: number | string): void {
    if (noteId == null) {
      this.errorMessage = 'لم يتم تحديد ملاحظة للحذف';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.employeesService.deleteEmployeeNote(noteId).subscribe({
      next: (response: any) => {
        this.isSaving = false;

        if (response?.isSuccess === false) {
          this.errorMessage = response?.message || 'فشل حذف الملاحظة';
          return;
        }

        this.successMessage = response?.message || 'تم حذف الملاحظة بنجاح';
        this.loadEmployeeDetails();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err?.error?.message || err?.message || 'حدث خطأ أثناء حذف الملاحظة';
      }
    });
  }

  openDeleteModal(emp: Employee): void {
    if (!emp || !emp.id) {
      this.errorMessage = 'لا يمكن حذف هذا الموظف لأن معرفه غير متوفر';
      return;
    }

    this.deleteTargetEmployee = emp;
    this.deleteModalMessage = `هل أنت متأكد أنك تريد حذف الموظف "${emp.name || emp.employeeCode || ''}"؟`;
    this.showDeleteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTargetEmployee = null;
    this.deleteModalMessage = '';
  }

  confirmDeleteModal(): void {
    const id = this.deleteTargetEmployee?.id;

    this.showDeleteModal = false;
    this.deleteTargetEmployee = null;
    this.deleteModalMessage = '';

    if (!id) {
      this.errorMessage = 'لم يتم تحديد موظف للحذف';
      return;
    }

    this.deleteEmployee(id);
  }

  cancelPendingDelete(): void {
    this.pendingDeleteId = null;
  }

  deleteEmployee(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.employeesService.deleteEmployee(id).subscribe({
      next: (resp: any) => {
        const data = resp?.data ?? resp;
        const success = data === true || resp?.isSuccess === true || data?.isSuccess === true || data?.data === true;

        if (success) {
          this.successMessage = 'تم حذف الموظف بنجاح';
          this.pendingDeleteId = null;
          this.loadEmployees();
        } else {
          this.errorMessage = resp?.message || 'فشل حذف الموظف';
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Delete employee error:', err);
        this.errorMessage = err?.error?.message || err?.message || 'حدث خطأ أثناء حذف الموظف';
        this.isLoading = false;
      }
    });
  }

  saveEmployee(): void {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
          this.pendingDeleteId = null;
          this.loadEmployees();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const isUpdate = this.selectedEmployeeId !== null;
    const employee: EmployeePayload | UpdateEmployeePayload = isUpdate
      ? this.getUpdateEmployeePayloadFromForm()
      : this.getEmployeePayloadFromForm();

    console.log('Employee Payload Sent:', employee);

    if (!isUpdate && 'employeeCode' in employee && !employee.employeeCode) {
      this.errorMessage = 'كود الموظف مطلوب';
      this.isSaving = false;
      return;
    }

    if (!employee.name) {
      this.errorMessage = 'اسم الموظف مطلوب';
      this.isSaving = false;
      return;
    }

    if (!employee.departmentId || employee.departmentId <= 0) {
      this.errorMessage = 'رقم القسم مطلوب ويجب أن يكون صحيح';
      this.isSaving = false;
      return;
    }

    if (!this.isValidTimeString(employee.scheduleIn)) {
      this.errorMessage = 'موعد الحضور غير صحيح';
      this.isSaving = false;
      return;
    }

    if (!this.isValidTimeString(employee.scheduleOut)) {
      this.errorMessage = 'موعد الانصراف غير صحيح';
      this.isSaving = false;
      return;
    }

    if (!this.isValidTimeString(employee.graceTime)) {
      this.errorMessage = 'وقت السماح غير صحيح';
      this.isSaving = false;
      return;
    }

    if (isUpdate) {
      this.employeesService.updateEmployee(this.selectedEmployeeId!, employee as UpdateEmployeePayload).subscribe({
        next: (response: any) => {
          console.log('Update Employee Response:', response);

          if (response?.isSuccess === false) {
            this.errorMessage = response?.message || 'فشل تعديل بيانات الموظف';
            this.isSaving = false;
            return;
          }

          this.afterSave(response?.message || 'تم تعديل بيانات الموظف بنجاح');
        },
        error: (err) => {
          console.log('Update employee error:', err);

          this.errorMessage =
            err?.error?.message ||
            err?.message ||
            'حدث خطأ أثناء تعديل بيانات الموظف';

          this.isSaving = false;
        }
      });

      return;
    }

    this.employeesService.addEmployee(employee).subscribe({
      next: (response: any) => {
        console.log('Add Employee Response:', response);

        if (response?.isSuccess === false) {
          this.errorMessage = response?.message || 'فشل إضافة الموظف';
          this.isSaving = false;
          return;
        }

        this.afterSave(response?.message || 'تم إضافة الموظف بنجاح');
      },
      error: (err) => {
        console.log('Add employee error:', err);

        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'حدث خطأ أثناء إضافة الموظف';

        this.isSaving = false;
      }
    });
  }

  private getEmployeePayloadFromForm(): EmployeePayload {
    return {
      employeeCode: String(this.employeeForm.value.employeeCode || '').trim(),
      name: String(this.employeeForm.value.name || '').trim(),
      departmentId: Number(this.employeeForm.value.departmentId),
      locationId: this.employeeForm.value.locationId != null ? Number(this.employeeForm.value.locationId) : undefined,
      scheduleIn: this.normalizeExcelTime(this.employeeForm.value.scheduleIn),
      scheduleOut: this.normalizeExcelTime(this.employeeForm.value.scheduleOut),
      graceTime: this.normalizeExcelTime(this.employeeForm.value.graceTime),
      note: String(this.employeeForm.value.note || '').trim()
    };
  }

  private getUpdateEmployeePayloadFromForm(): UpdateEmployeePayload {
    return {
      name: String(this.employeeForm.value.name || '').trim(),
      departmentId: Number(this.employeeForm.value.departmentId),
      locationId: this.employeeForm.value.locationId != null ? Number(this.employeeForm.value.locationId) : undefined,
      scheduleIn: this.normalizeExcelTime(this.employeeForm.value.scheduleIn),
      scheduleOut: this.normalizeExcelTime(this.employeeForm.value.scheduleOut),
      graceTime: this.normalizeExcelTime(this.employeeForm.value.graceTime),
      note: String(this.employeeForm.value.note || '').trim()
    };
  }

  editEmployee(employee: Employee): void {
    if (!employee.id) {
      this.errorMessage = 'لا يمكن تعديل هذا الموظف لأن رقم ID غير موجود';
      return;
    }

    this.selectedEmployeeId = employee.id;

    const departmentId =
      employee.departmentId && employee.departmentId > 0
        ? employee.departmentId
        : this.getDepartmentIdFromMapOnly(employee.departmentName || '');

    this.employeeForm.controls['employeeCode'].enable();

    this.employeeForm.patchValue({
      employeeCode: employee.employeeCode,
      name: employee.name,
      departmentId: departmentId || null,
      locationId: employee.locationId != null ? employee.locationId : null,
      scheduleIn: this.timeForInput(employee.scheduleIn),
      scheduleOut: this.timeForInput(employee.scheduleOut),
      graceTime: this.timeForInput(employee.graceTime),
      note: employee.note ?? (employee as any).notes ?? ''
    });

    this.successMessage = '';
    this.errorMessage = '';

    console.log('Editing Employee:', employee);
    console.log('Selected Employee ID:', this.selectedEmployeeId);
    console.log('Resolved Department ID:', departmentId);

    this.activeEmployeePage = 'edit';
    this.employeeForm.controls['employeeCode'].disable();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: 'edit',
        id: employee.id
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  cancelEdit(): void {
    this.selectedEmployeeId = null;
    this.employeeForm.reset();
    this.employeeForm.controls['employeeCode'].enable();
    this.errorMessage = '';
    this.successMessage = '';
    this.activeEmployeePage = 'list';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: 'list'
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private afterSave(message: string): void {
    this.isSaving = false;
    this.selectedEmployeeId = null;
    this.employeeForm.reset();
    this.successMessage = message;
    this.errorMessage = '';
    this.activeEmployeePage = 'list';
    this.loadEmployees();
  }

  onEmployeeSheetSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    this.readEmployeeExcelFile(file);

    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer?.files?.[0];

    if (!file) {
      return;
    }

    this.readEmployeeExcelFile(file);
  }

  private readEmployeeExcelFile(file: File): void {
    this.excelFileName = file.name;
    this.excelEmployees = [];
    this.excelErrorMessage = '';
    this.excelSuccessMessage = '';
    this.excelRowErrors = [];
    this.bulkImportResults = [];
    this.bulkImportErrors = [];
    this.missingDepartmentNames = [];
    this.unknownDepartments = [];
    this.hasImportedCurrentSheet = false;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'xlsx' && extension !== 'xls') {
      this.excelErrorMessage = 'من فضلك قم برفع ملف Excel بصيغة xlsx أو xls فقط';
      return;
    }

    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        const workbook: WorkBook = read(arrayBuffer, {
          type: 'array',
          cellDates: false
        });

        if (!workbook.SheetNames.length) {
          this.excelErrorMessage = 'ملف Excel لا يحتوي على Sheets';
          return;
        }

        const employeesMap = new Map<string, Employee>();

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet: WorkSheet = workbook.Sheets[sheetName];

          const rows = utils.sheet_to_json(worksheet, {
            defval: '',
            raw: true
          }) as any[];

          rows.forEach((row, index) => {
            const employee = this.mapAttendanceRowToEmployee(row);

            if (!employee) {
              return;
            }

            if (employeesMap.has(employee.employeeCode)) {
              return;
            }

            const missingFields = this.getMissingFields(employee);

            if (missingFields.length > 0) {
              this.excelRowErrors.push(
                `Sheet ${sheetName} - صف رقم ${index + 2}: بيانات ناقصة أو غير صحيحة: ${missingFields.join(' - ')}`
              );
              return;
            }

            employeesMap.set(employee.employeeCode, employee);
          });
        });

        this.excelEmployees = Array.from(employeesMap.values());

        if (this.excelEmployees.length === 0) {
          this.excelErrorMessage = 'لم يتم استخراج بيانات موظفين صحيحة من الشيت';
          return;
        }

        this.excelSuccessMessage =
          `تم استخراج ${this.excelEmployees.length} موظف بدون تكرار من ملف الحضور، وجاري حفظهم في السيستم...`;

        this.unknownDepartments = [];
        this.excelErrorMessage = '';

        this.autoImportEmployees();

        console.log('Employees JSON:', this.getEmployeesImportPayload());
        console.log('Excel Row Errors:', this.excelRowErrors);
      } catch (error) {
        console.log(error);
        this.excelErrorMessage = 'حدث خطأ أثناء قراءة ملف Excel';
      }
    };

    reader.readAsArrayBuffer(file);
  }

  private mapAttendanceRowToEmployee(row: any): Employee | null {
    const employeeCode = String(
      this.getCellValue(row, [
        'كود الموظف',
        'employeeCode',
        'EmployeeCode',
        'Employee Code',
        'code',
        'Code'
      ])
    ).trim();

    const name = String(
      this.getCellValue(row, [
        'اسم الموظف',
        'name',
        'Name',
        'Employee Name',
        'employeeName'
      ])
    ).trim();

    const departmentName = String(
      this.getCellValue(row, [
        'الإدارة',
        'الادارة',
        'الإداره',
        'department',
        'Department',
        'departmentName',
        'Department Name'
      ])
    ).trim();

    const scheduleInRaw = this.getCellValue(row, [
      'ميعاد الحضور',
      'موعد الحضور',
      'scheduleIn',
      'ScheduleIn',
      'Schedule In'
    ]);

    const scheduleOutRaw = this.getCellValue(row, [
      'ميعاد الانصراف',
      'موعد الانصراف',
      'scheduleOut',
      'ScheduleOut',
      'Schedule Out'
    ]);

    const graceRaw = this.getCellValue(row, [
      'فترة التأخير',
      'وقت السماح',
      'graceTime',
      'GraceTime',
      'Grace Time'
    ]);

    const locationId = this.getNumberCellValue(row, [
      'Location',
      'location',
      'locationId',
      'LocationId',
      'Location ID',
      'location id',
      'لوكيشن',
      'Location رقم',
      'المكان '
    ]);

    const isChristian = this.getBooleanCellValue(row, [
      'مسيحي',
      'christian',
      'isChristian',
      'Christian'
    ]);

    if (!employeeCode || !name) {
      return null;
    }

    return {
      employeeCode,
      name,
      departmentId: 0,
      departmentName,
      locationId,
      scheduleIn: this.normalizeExcelTime(scheduleInRaw),
      scheduleOut: this.normalizeExcelTime(scheduleOutRaw),
      graceTime: this.calculateGraceTime(scheduleInRaw, graceRaw),
      isChristian
    };
  }

  private getDepartmentIdFromMapOnly(departmentName: string): number {
    const normalizedName = this.normalizeArabicText(departmentName);

    const matchedKey = Object.keys(this.departmentMap).find(
      (key) => this.normalizeArabicText(key) === normalizedName
    );

    if (matchedKey) {
      return this.departmentMap[matchedKey];
    }

    return 0;
  }

  applyManualDepartmentIds(): void {
    this.unknownDepartments = [];
    this.excelRowErrors = [];
    this.excelErrorMessage = '';
    this.excelSuccessMessage =
      'تم تجاوز ربط أرقام الأقسام، لأن الاستيراد يعتمد على اسم الإدارة فقط.';

    this.autoImportEmployees();
  }

  trackDepartment(index: number, department: UnknownDepartment): string {
    return department.key;
  }

  private getCellValue(row: any, possibleKeys: string[]): any {
    const rowKeys = Object.keys(row);

    for (const key of possibleKeys) {
      const matchedKey = rowKeys.find(
        (rowKey) => this.normalizeArabicText(rowKey) === this.normalizeArabicText(key)
      );

      if (
        matchedKey &&
        row[matchedKey] !== null &&
        row[matchedKey] !== undefined &&
        String(row[matchedKey]).trim() !== ''
      ) {
        return row[matchedKey];
      }
    }

    return '';
  }

  private getBooleanCellValue(row: any, possibleKeys: string[]): boolean | undefined {
    const cellValue = this.getCellValue(row, possibleKeys);

    if (cellValue === '' || cellValue === null || cellValue === undefined) {
      return undefined;
    }

    const value = String(cellValue).trim().toLowerCase();

    if (value === '1' || value === 'true' || value === 'yes' || value === 'نعم') {
      return true;
    }

    if (value === '0' || value === 'false' || value === 'no' || value === 'لا') {
      return false;
    }

    return undefined;
  }

  private getNumberCellValue(row: any, possibleKeys: string[]): number | undefined {
    const cellValue = this.getCellValue(row, possibleKeys);

    if (cellValue === '' || cellValue === null || cellValue === undefined) {
      return undefined;
    }

    const value = Number(cellValue);
    if (Number.isFinite(value)) {
      return Math.trunc(value);
    }

    const parsedValue = parseInt(String(cellValue).replace(/\D+/g, ''), 10);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  private normalizeBoolean(value: any): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const normalized = String(value).trim().toLowerCase();

    if (['1', 'true', 'yes', 'نعم'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'لا'].includes(normalized)) {
      return false;
    }

    return undefined;
  }

  private normalizeEmployeeBooleans(employee: any): Employee {
    return {
      ...employee,
      isChristian: this.normalizeBoolean(employee?.isChristian)
    } as Employee;
  }

  private getMissingFields(employee: Employee): string[] {
    const missing: string[] = [];

    if (!employee.employeeCode) {
      missing.push('كود الموظف');
    }

    if (!employee.name) {
      missing.push('اسم الموظف');
    }

    if (!employee.departmentName || employee.departmentName.trim() === '') {
      missing.push('اسم الإدارة');
    }

    if (!employee.scheduleIn || !this.isValidTimeString(employee.scheduleIn)) {
      missing.push('موعد الحضور');
    }

    if (!employee.scheduleOut || !this.isValidTimeString(employee.scheduleOut)) {
      missing.push('موعد الانصراف');
    }

    if (!employee.graceTime || !this.isValidTimeString(employee.graceTime)) {
      missing.push('وقت السماح');
    }

    return missing;
  }

  private autoImportEmployees(): void {
    if (this.hasImportedCurrentSheet) {
      return;
    }

    if (this.isImporting) {
      return;
    }

    if (this.excelEmployees.length === 0) {
      return;
    }

    const invalidDepartmentNames = this.excelEmployees.filter(
      (employee) => !employee.departmentName || employee.departmentName.trim() === ''
    );

    if (invalidDepartmentNames.length > 0) {
      this.excelErrorMessage =
        `يوجد ${invalidDepartmentNames.length} موظف بدون اسم إدارة صحيح.`;
      return;
    }

    const invalidTimes = this.excelEmployees.filter(
      (employee) =>
        !this.isValidTimeString(employee.scheduleIn) ||
        !this.isValidTimeString(employee.scheduleOut) ||
        !this.isValidTimeString(employee.graceTime)
    );

    if (invalidTimes.length > 0) {
      this.excelErrorMessage =
        `يوجد ${invalidTimes.length} موظف لديهم مواعيد غير صحيحة. راجعي بيانات الشيت.`;
      return;
    }

    this.bulkImportEmployees();
  }

  bulkImportEmployees(): void {
    if (this.excelEmployees.length === 0) {
      this.excelErrorMessage = 'لا توجد بيانات موظفين صالحة للاستيراد';
      return;
    }

    const invalidDepartmentNames = this.excelEmployees.filter(
      (employee) => !employee.departmentName || employee.departmentName.trim() === ''
    );

    if (invalidDepartmentNames.length > 0) {
      this.excelErrorMessage =
        `يوجد ${invalidDepartmentNames.length} موظف بدون اسم إدارة صحيح.`;
      return;
    }

    const invalidTimes = this.excelEmployees.filter(
      (employee) =>
        !this.isValidTimeString(employee.scheduleIn) ||
        !this.isValidTimeString(employee.scheduleOut) ||
        !this.isValidTimeString(employee.graceTime)
    );

    if (invalidTimes.length > 0) {
      this.excelErrorMessage =
        `يوجد ${invalidTimes.length} موظف لديهم مواعيد غير صحيحة. راجعي بيانات الشيت.`;
      return;
    }

    this.isImporting = true;
    this.excelErrorMessage = '';
    this.excelSuccessMessage = 'جاري حفظ الموظفين في السيستم...';

    const payload = this.getEmployeesImportPayload();

    const uniqueDepartmentsSent = Array.from(
      new Set(payload.map((item) => item.departmentName))
    ).sort();

    console.log('Unique Departments Sent To API:');
    console.table(uniqueDepartmentsSent);

    const departmentCompare = this.excelEmployees.map((employee, index) => ({
      originalFromExcel: employee.departmentName,
      sentToApi: payload[index].departmentName
    }));

    console.table(departmentCompare);
    console.log('Final Payload Sent To API:', payload);

    this.employeesService.bulkImportEmployees(payload).subscribe({
      next: (response) => {
        console.log('Bulk import response:', response);
        console.log('Bulk import response JSON:', JSON.stringify(response, null, 2));

        this.hasImportedCurrentSheet = true;
        this.isImporting = false;

        const responseAny = response as any;

        const data =
          responseAny?.data?.data ||
          responseAny?.data ||
          responseAny;

        const successCount =
          data?.successCount ??
          data?.succeededCount ??
          data?.insertedCount ??
          data?.savedCount ??
          0;

        const skippedCount =
          data?.skippedCount ??
          data?.skipCount ??
          0;

        const failedCount =
          data?.failedCount ??
          data?.failureCount ??
          data?.errorCount ??
          0;

        this.bulkImportResults = this.extractBulkImportResults(response);

        this.bulkImportErrors = this.bulkImportResults.filter((item: any) =>
          String(item?.status || '').toLowerCase() === 'failed'
        );

        this.missingDepartmentNames = this.extractMissingDepartmentNames(this.bulkImportErrors);

        console.log('Missing Departments From API Response:');
        console.table(this.missingDepartmentNames);

        console.table(this.bulkImportErrors.slice(0, 50));
        console.table(this.getFailureReasonsSummary(this.bulkImportErrors));

        if (successCount === 0 && skippedCount === 0 && failedCount === 0) {
          this.excelSuccessMessage =
            `تم إرسال ${payload.length} موظف للسيستم، لكن السيرفر لم يرجع أرقام الحفظ بوضوح. راجعي Response في Console.`;
        } else {
          this.excelSuccessMessage =
            `تم الاستيراد: ${successCount} تم حفظهم، ${skippedCount} تم تخطيهم، ${failedCount} فشل حفظهم.`;
        }

        if (failedCount > 0 || this.bulkImportErrors.length > 0) {
          this.excelErrorMessage =
            `فشل حفظ ${failedCount || this.bulkImportErrors.length} موظف. السبب غالبًا أن أسماء الإدارات غير موجودة أو غير مطابقة في قاعدة البيانات.`;
        }

        this.loadEmployees();
      },
      error: (err) => {
        console.log('Bulk import error:', err);
        this.excelErrorMessage =
          err?.error?.message ||
          err?.message ||
          'حدث خطأ أثناء حفظ بيانات الشيت في السيستم';
        this.isImporting = false;
      }
    });
  }

  private getEmployeesImportPayload(): BulkImportEmployeePayload[] {
    return this.excelEmployees.map((employee) => ({
      employeeCode: employee.employeeCode,
      name: employee.name,
      departmentName: this.getBestDepartmentNameFromDatabase(employee.departmentName || ''),
      locationId: employee.locationId,
      scheduleIn: employee.scheduleIn,
      scheduleOut: employee.scheduleOut,
      graceTime: employee.graceTime,
      isChristian: employee.isChristian
    }));
  }

  private getBestDepartmentNameFromDatabase(excelDepartmentName: string): string {
    const originalName = String(excelDepartmentName || '').trim();

    if (!originalName) {
      return '';
    }

    const normalizedExcelName = this.normalizeArabicText(originalName);

    const aliasKey = Object.keys(this.departmentAliases).find(
      (key) => this.normalizeArabicText(key) === normalizedExcelName
    );

    if (aliasKey) {
      return this.departmentAliases[aliasKey];
    }

    const exactDbName = this.databaseDepartmentNames.find(
      (dbName) => this.normalizeArabicText(dbName) === normalizedExcelName
    );

    if (exactDbName) {
      return exactDbName;
    }

    const containsDbName = this.databaseDepartmentNames.find((dbName) => {
      const normalizedDbName = this.normalizeArabicText(dbName);

      return (
        normalizedExcelName.includes(normalizedDbName) ||
        normalizedDbName.includes(normalizedExcelName)
      );
    });

    if (containsDbName) {
      return containsDbName;
    }

    let bestMatch = '';
    let bestScore = 0;

    for (const dbDepartmentName of this.databaseDepartmentNames) {
      const normalizedDbName = this.normalizeArabicText(dbDepartmentName);
      const score = this.getSimilarityScore(normalizedExcelName, normalizedDbName);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = dbDepartmentName;
      }
    }

    if (bestScore >= 0.75) {
      return bestMatch;
    }

    return originalName;
  }

  private getSimilarityScore(a: string, b: string): number {
    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);

    if (maxLength === 0) {
      return 1;
    }

    return 1 - distance / maxLength;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  private extractMissingDepartmentNames(errors: any[]): string[] {
    const departments = new Set<string>();

    errors.forEach((item) => {
      const reason = String(item?.reason || '');
      const match = reason.match(/Department\s+'(.+?)'\s+not found/i);

      if (match && match[1]) {
        departments.add(match[1].trim());
      }
    });

    return Array.from(departments).sort();
  }

  private extractBulkImportResults(response: any): any[] {
    const data = response?.data || response;

    if (!data || typeof data !== 'object') {
      return [];
    }

    const possibleArrays = [
      data.results,
      data.items,
      data.details,
      data.errors,
      data.failedItems,
      data.failures,
      data.importResults,
      data.employeeResults
    ];

    for (const item of possibleArrays) {
      if (Array.isArray(item)) {
        return item;
      }
    }

    const firstArrayValue = Object.values(data).find((value) => Array.isArray(value));

    return Array.isArray(firstArrayValue) ? firstArrayValue : [];
  }

  private getFailureReasonsSummary(errors: any[]): { reason: string; count: number }[] {
    const reasonMap = new Map<string, number>();

    errors.forEach((item) => {
      const reason = String(item?.reason || 'سبب غير معروف').trim();
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
    });

    return Array.from(reasonMap.entries()).map(([reason, count]) => ({
      reason,
      count
    }));
  }

  clearExcelData(): void {
    this.excelEmployees = [];
    this.excelFileName = '';
    this.excelErrorMessage = '';
    this.excelSuccessMessage = '';
    this.excelRowErrors = [];
    this.bulkImportResults = [];
    this.bulkImportErrors = [];
    this.missingDepartmentNames = [];
    this.unknownDepartments = [];
    this.hasImportedCurrentSheet = false;
  }

  normalizeExcelTime(value: any): string {
    if (value === null || value === undefined || value === '' || value === '-') {
      return '';
    }

    if (typeof value === 'number') {
      const fraction = value % 1;
      const totalSeconds = Math.round(fraction * 24 * 60 * 60);
      return this.secondsToTime(totalSeconds);
    }

    if (value instanceof Date) {
      return `${this.pad(value.getHours())}:${this.pad(value.getMinutes())}:${this.pad(value.getSeconds())}`;
    }

    const text = String(value).trim().toUpperCase();

    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/);

    if (!match) {
      return text;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);
    const meridiem = match[4];

    if (minutes > 59 || seconds > 59) {
      return text;
    }

    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    }

    if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    if (hours > 23) {
      return text;
    }

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private calculateGraceTime(scheduleInRaw: any, graceRaw: any): string {
    const graceSeconds = this.excelTimeToSeconds(graceRaw);

    if (graceSeconds === null) {
      return '';
    }

    if (graceSeconds <= 3 * 60 * 60) {
      return this.secondsToTime(graceSeconds);
    }

    const scheduleInSeconds = this.excelTimeToSeconds(scheduleInRaw);

    if (scheduleInSeconds === null) {
      return this.secondsToTime(graceSeconds);
    }

    let diff = graceSeconds - scheduleInSeconds;

    if (diff < 0) {
      diff += 24 * 60 * 60;
    }

    return this.secondsToTime(diff);
  }

  private excelTimeToSeconds(value: any): number | null {
    const normalizedTime = this.normalizeExcelTime(value);

    if (!this.isValidTimeString(normalizedTime)) {
      return null;
    }

    const [hours, minutes, seconds] = normalizedTime.split(':').map(Number);

    return hours * 3600 + minutes * 60 + seconds;
  }

  private secondsToTime(totalSeconds: number): string {
    const normalized = ((totalSeconds % 86400) + 86400) % 86400;

    const hours = Math.floor(normalized / 3600);
    const minutes = Math.floor((normalized % 3600) / 60);
    const seconds = normalized % 60;

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private isValidTimeString(value: string): boolean {
    if (!value) {
      return false;
    }

    const match = String(value).match(/^(\d{2}):(\d{2}):(\d{2})$/);

    if (!match) {
      return false;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);

    return (
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59 &&
      seconds >= 0 &&
      seconds <= 59
    );
  }

  timeForInput(value: string): string {
    if (!value) {
      return '';
    }

    const normalized = this.normalizeExcelTime(value);

    if (!this.isValidTimeString(normalized)) {
      return '';
    }

    return normalized.substring(0, 5);
  }

  private normalizeArabicText(value: string): string {
    return String(value || '')
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[ؤئء]/g, '')
      .replace(/[ًٌٍَُِّْ]/g, '')
      .replace(/[ـ]/g, '')
      .replace(/[^\u0600-\u06FF\w\s]/g, ' ')


      .replace(/\s+و\s+/g, ' و ')
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

}