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

import { EmployeesService } from '../service/employees.service';
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

 // 🛠️ تم فصل وتحديث الخرائط لترتبط بالـ IDs الصحيحة للأقسام الثلاثة بشكل مستقل
  departmentMap: Record<string, number> = {
    'ادارة الازمات': 1,
    'إدارة الأزمات': 1,
    'الاتصال السياسي': 2,
    'الموارد البشرية': 30, 
    'تكنولوجيا المعلومات': 26,
    
    // 1. قسم الاعلام
    'الاعلام': 6,
    'الإعلام': 6,
    'قسم الاعلام': 6,
    'قسم الإعلام': 6,
    
    // 2. قسم الرصد الإعلامي
    'الرصد الإعلامي': 18,
    'الرصد الاعلامي': 18,
    
    // 3. قسم مكتب الإعلام
    'مكتب الاعلام': 39,
    'مكتب الإعلام': 39
  };

  // 🛠️ قائمة الخيارات المحدثة التي تحتوي على الأقسام الثلاثة بشكل منفصل
  departmentOptions: { id: number; name: string }[] = [
    { id: 1, name: 'إدارة الأزمات' },
    { id: 2, name: 'الاتصال السياسي' },
    { id: 3, name: 'الإدارة العامة للتنمية' },
    { id: 4, name: 'الاستثمار' },
    { id: 5, name: 'الإسكان' },
    { id: 6, name: 'الاعلام' }, // القسم الأول
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
    { id: 18, name: 'الرصد الإعلامي' }, // القسم الثاني
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
    { id: 39, name: 'مكتب الإعلام' }, // القسم الثالث
    { id: 40, name: 'مكتب المستشار القضائي' },
    { id: 41, name: 'مكتب مفوض الدولة' }
  ];

  // 🛠️ مصفوفة الأسماء المستخدمة في الفلترة والتحقق
  databaseDepartmentNames: string[] = [
    'إدارة الأزمات', 'الاتصال السياسي', 'الإدارة العامة للتنمية', 'الاستثمار', 'الإسكان', 
    'الاعلام', 'الرصد الإعلامي', 'مكتب الإعلام', // الثلاثة أقسام مدرجة هنا
    'الإعلانات', 'الأمن', 'الأمومة والطفولة', 'التخطيط العمراني', 'التخطيط والمتابعة',
    'التنمية الحضارية', 'التوريدات', 'الحجز الإداري', 'الحسابات', 'الحوكمة', 'الخزينة',
    'السياحة', 'الشؤون الإدارية', 'الشؤون المالية', 'الشؤون القانونية',
    'الصندوق التأميني', 'العلاقات الدولية', 'العلاقات العامة', 'المتغيرات المكانية',
    'المخازن', 'المركبات', 'المكتب الفني', 'الموارد البشرية', 'الهيئة الموازنية',
    'ترشيد الطاقة', 'حساب الخدمات', 'خدمة المواطنين', 'شؤون المجالس', 'شؤون المقر',
    'صندوق الخدمات', 'فض المنازعات', 'مكتب المستشار القضائي', 'مكتب مفوض الدولة'
  ];

  constructor(
    private fb: FormBuilder,
    private employeesService: EmployeesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
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
      queryParams: { page, ...(id ? { id } : {}) },
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
      scheduleIn: ['', Validators.required],
      scheduleOut: ['', Validators.required],
      graceTime: ['', Validators.required],
      note: ['']
    });
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.employeesService
      .getEmployees(this.searchTerm, this.pageNumber, this.pageSize, this.departmentId)
      .subscribe({
        next: (response: any) => {
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

          this.employees = items || [];
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error(err);
          this.employees = [];
          this.errorMessage = 'حدث خطأ أثناء تحميل بيانات الموظفين';
          this.isLoading = false;
        }
      });
  }

  saveEmployee(): void {
    if (this.employeeForm.invalid) {
      this.errorMessage = 'يرجى ملء الحقول الإلزامية أولاً.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: EmployeePayload = this.employeeForm.value;

    if (this.activeEmployeePage === 'edit' && this.selectedEmployeeId) {
      this.employeesService.updateEmployee(this.selectedEmployeeId, payload as UpdateEmployeePayload).subscribe({
        next: () => {
          this.successMessage = 'تم تعديل بيانات الموظف بنجاح.';
          this.isSaving = false;
          setTimeout(() => this.backToEmployeesList(), 1500);
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.message || 'حدث خطأ أثناء التعديل.';
          this.isSaving = false;
        }
      });
    } else {
      // تم التعديل هنا ليتناسب مع addEmployee في الـ Service وتحديد نوع الخطأ
      this.employeesService.addEmployee(payload).subscribe({
        next: () => {
          this.successMessage = 'تم إضافة الموظف الجديد بنجاح.';
          this.isSaving = false;
          setTimeout(() => this.backToEmployeesList(), 1500);
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.message || 'حدث خطأ أثناء الإضافة.';
          this.isSaving = false;
        }
      });
    }
  }

  editEmployee(employee: Employee): void {
    if (employee && employee.id) {
      this.openEmployeePage('edit', employee.id);
    }
  }

  cancelEdit(): void {
    this.backToEmployeesList();
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
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.handleExcelParsing(event.dataTransfer.files[0]);
    }
  }

  onEmployeeSheetSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleExcelParsing(input.files[0]);
    }
  }

  private handleExcelParsing(file: File): void {
    this.excelFileName = file.name;
    this.excelErrorMessage = '';
    this.excelSuccessMessage = '';

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = utils.sheet_to_json(worksheet) as any[];

        this.excelEmployees = jsonData.map((row: any) => ({
          employeeCode: row['كود الموظف'] || row['الكود'],
          name: row['الاسم'] || row['اسم الموظف'],
          departmentName: row['القسم'] || row['الإدارة']
        })) as any[];

        this.excelSuccessMessage = `تم قراءة عدد ${this.excelEmployees.length} موظف بنجاح من الشيت.`;
      } catch (err: any) {
        this.excelErrorMessage = 'فشل في قراءة ملف الإكسيل، تأكد من الهيكل.';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  clearExcelData(): void {
    this.excelFileName = '';
    this.excelEmployees = [];
    this.excelErrorMessage = '';
    this.excelSuccessMessage = '';
    this.unknownDepartments = [];
    this.missingDepartmentNames = [];
    this.hasImportedCurrentSheet = false;
  }

  trackDepartment(index: number, item: UnknownDepartment): string {
    return item.key || String(index);
  }

  applyManualDepartmentIds(): void {
    this.unknownDepartments.forEach(ud => {
      if (ud.id) {
        this.departmentMap[ud.key] = ud.id;
      }
    });
    this.excelSuccessMessage = 'تم ربط الأقسام وتحديث الهيكل يدويًا بنجاح.';
  }

  bulkImportEmployees(): void {
    if (this.excelEmployees.length === 0) return;

    this.isImporting = true;
    const payload: BulkImportEmployeePayload[] = this.excelEmployees.map(emp => ({
      employeeCode: emp.employeeCode,
      name: emp.name,
      departmentId: this.departmentMap[(emp as any).departmentName] || null
    })) as any;

    // تم التعديل هنا لاستخدام bulkImportEmployees مع تحديد أنواع المعاملات
    this.employeesService.bulkImportEmployees(payload).subscribe({
      next: (res: any) => {
        this.isImporting = false;
        this.hasImportedCurrentSheet = true;
        this.excelSuccessMessage = 'تم استيراد قائمة الموظفين بنجاح إلى قاعدة البيانات.';
      },
      error: (err: any) => {
        this.isImporting = false;
        this.excelErrorMessage = 'حدث خطأ أثناء الاستيراد الجماعي.';
      }
    });
  }

  openDeleteModal(employee: Employee): void {
    if (employee && employee.id) {
      this.deleteTargetEmployee = employee;
      this.pendingDeleteId = employee.id;
      this.deleteModalMessage = `هل أنتِ متأكدة من رغبتك في حذف الموظف: "${employee.name}" نهائيًا؟`;
      this.showDeleteModal = true;
    }
  }

  confirmDeleteModal(): void {
    if (this.pendingDeleteId) {
      this.employeesService.deleteEmployee(this.pendingDeleteId).subscribe({
        next: () => {
          this.showDeleteModal = false;
          this.loadEmployees();
        },
        error: (err: any) => {
          console.error(err);
          this.showDeleteModal = false;
        }
      });
    }
  }

  cancelDeleteModal(): void {
    this.showDeleteModal = false;
    this.pendingDeleteId = null;
    this.deleteTargetEmployee = null;
  }

openNoteModal(employee: Employee): void {
    if (employee) {
      this.noteTargetEmployee = employee;
      this.noteModalEmployeeName = employee.name;
      this.showNoteModal = true;
    }
  }

  // 👇 أضيفي هذه الدالة هنا لحل خطأ الـ HTML
  cancelNoteModal(): void {
    this.showNoteModal = false;
    this.noteTargetEmployee = null;
    this.noteModalEmployeeName = '';
  }

  confirmAddEmployeeNote(noteText: string): void {
    if (this.noteTargetEmployee?.id) {
      this.employeesService.addEmployeeNote(this.noteTargetEmployee.id, noteText).subscribe({
        next: () => {
          this.showNoteModal = false;
          this.loadEmployees();
        },
        error: (err: any) => {
          console.error(err);
          this.showNoteModal = false;
        }
      });
    }
  }

 
  deleteEmployeeNote(noteId: any): void {
    // تم التعديل هنا لاستخدام دالة deleteEmployeeNote المباشرة من الخدمة وتحديد النوع
    this.employeesService.deleteEmployeeNote(noteId).subscribe({
      next: () => this.loadEmployeeDetails(),
      error: (err: any) => console.error(err)
    });
  }

  exportEmployeesListToExcel(): void {
    const ws: WorkSheet = utils.json_to_sheet(this.employees);
    const wb: WorkBook = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Employees');
    writeFile(wb, 'قائمة_الموظفين.xlsx');
  }

  exportEmployeeDetailsToExcel(): void {
    if (this.employeeDetailsRows.length === 0) return;
    const ws: WorkSheet = utils.json_to_sheet(this.employeeDetailsRows);
    const wb: WorkBook = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Attendance_Details');
    writeFile(wb, `سجل_حركات_${this.selectedEmployeeForDetails?.name}.xlsx`);
  }

  getDepartmentNameById(id: number | null | undefined): string {
    if (!id) return '';
    return this.departmentOptions.find((dep) => dep.id === Number(id))?.name || '';
  }

  formatWorkedHours(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    const totalMinutes = Number(value);
    if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '-';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes} دقيقة`;
    if (minutes === 0) return `${hours} ساعة`;
    return `${hours} ساعة و ${minutes} دقيقة`;
  }

  getStatusLabel(status: unknown): string {
    const value = String(status ?? '').trim();
    if (!value) return '-';
    const normalized = value.toLowerCase();
    const translations: Record<string, string> = {
      present: 'حاضر', absent: 'غائب', late: 'متأخر',
      earlydeparture: 'انصراف مبكر', early_departure: 'انصراف مبكر',
      overtime: 'إضافي', ontime: 'في الميعاد', 'في الميعاد': 'في الميعاد'
    };
    return translations[normalized] || value;
  }

  getNoteLabel(notes: string | null | undefined): string {
    const value = String(notes || '').trim();
    if (!value) return '-';
    const lowerValue = value.toLowerCase();
    if (lowerValue.includes('checkin without checkout') || lowerValue.includes('checkout without checkin')) {
      return 'دخول بدون خروج - يحتاج مراجعة';
    }
    if (lowerValue.includes('needs review')) return 'يحتاج مراجعة';
    return value;
  }

  setTodayAnalyticsDate(): void {
    const today = new Date();
    this.analyticsDate = this.analyticsDateToApi(today);
    this.analyticsDateDisplay = this.analyticsDateToDisplay(today);
  }

  formatAnalyticsDateWhileTyping(): void {
    let value = String(this.analyticsDateDisplay || '').replace(/\D/g, '').slice(0, 8);
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
      this.employeesAnalyticsErrorMessage = 'من فضلك اكتب التاريخ بطريقة صحيحة مثل: 31/03/2026';
      return;
    }

    this.analyticsDate = apiDate;
    this.analyticsDateDisplay = this.analyticsApiDateToDisplay(apiDate);
    this.isLoadingEmployeesAnalytics = true;
    this.employeesAnalyticsErrorMessage = '';
    this.employeesAnalyticsSuccessMessage = '';

    this.employeesService.getEmployeesSummary(this.analyticsDate).subscribe({
      next: (response: any) => {
        const data = response?.data || response;
        this.employeesAnalyticsRaw = data;
        this.employeesAnalyticsRows = this.extractAnalyticsRows(data);
        this.analyticsStats = this.buildAnalyticsStats(data, this.employeesAnalyticsRows);
        this.analyticsDepartmentRows = this.buildDepartmentAnalyticsRows(this.employeesAnalyticsRows);
        this.employeesAnalyticsSuccessMessage = 'تم تحميل تحليل البيانات بنجاح';
        this.isLoadingEmployeesAnalytics = false;
      },
      error: (err: any) => {
        console.error(err);
        this.clearEmployeesAnalytics();
        this.employeesAnalyticsErrorMessage = err?.error?.message || err?.message || 'حدث خطأ أثناء تحميل تحليل البيانات';
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
    this.analyticsStats = { total: 0, present: 0, absent: 0, late: 0, earlyDeparture: 0, needsReview: 0, reviewed: 0 };
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
      earlyDeparture: this.pickNumber(data, ['earlyDeparture', 'earlyDepartureCount', 'totalEarlyDeparture']),
      needsReview: this.pickNumber(data, ['needsReview', 'needsReviewCount']),
      reviewed: this.pickNumber(data, ['reviewed', 'reviewedCount'])
    };

    const hasApiStats = Object.values(apiStats).some((value) => value > 0);
    if (hasApiStats) return apiStats;

    const stats = { total: rows.length, present: 0, absent: 0, late: 0, earlyDeparture: 0, needsReview: 0, reviewed: 0 };
    rows.forEach((row: any) => {
      const status = String(row.status || row.attendanceStatus || row.todayStatus || '').trim();
      const notes = String(row.notes || '').toLowerCase();

      if (status === 'Present') stats.present++;
      else if (status === 'Absent') stats.absent++;
      else if (status === 'Late') stats.late++;
      else if (status === 'EarlyDeparture') stats.earlyDeparture++;

      if (notes.includes('needs review') || notes.includes('يحتاج مراجعة') || status === 'Incomplete') {
        stats.needsReview++;
      }
      if (row.isReviewed === true || notes.includes('reviewed')) {
        stats.reviewed++;
      }
    });
    return stats;
  }

  private buildDepartmentAnalyticsRows(rows: any[]): any[] {
    const map = new Map<string, any>();
    rows.forEach((row: any) => {
      const departmentName = row.departmentName || 'غير محدد';
      const status = String(row.status || '').trim();

      if (!map.has(departmentName)) {
        map.set(departmentName, { departmentName, total: 0, present: 0, absent: 0, late: 0, earlyDeparture: 0 });
      }

      const item = map.get(departmentName);
      item.total++;
      if (status === 'Present') item.present++;
      else if (status === 'Absent') item.absent++;
      else if (status === 'Late') item.late++;
      else if (status === 'EarlyDeparture') item.earlyDeparture++;
    });
    return Array.from(map.values());
  }

  private pickNumber(data: any, keys: string[]): number {
    for (const key of keys) {
      const value = Number(data?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  private analyticsDateToApi(date: Date): string {
    return `${date.getFullYear()}-${this.analyticsPad(date.getMonth() + 1)}-${this.analyticsPad(date.getDate())}`;
  }

  private analyticsDateToDisplay(date: Date): string {
    return `${this.analyticsPad(date.getDate())}/${this.analyticsPad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  private analyticsDisplayDateToApi(displayDate: string): string {
    const text = String(displayDate || '').trim();
    if (!text) return '';
    const normalizedText = text.replace(/[.\-]/g, '/');
    let day = 0, month = 0, year = 0;
    const slashMatch = normalizedText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (slashMatch) {
      day = Number(slashMatch[1]);
      month = Number(slashMatch[2]);
      year = Number(slashMatch[3]);
    } else {
      const digits = normalizedText.replace(/\D/g, '');
      if (!/^\d{8}$/.test(digits)) return '';
      day = Number(digits.slice(0, 2));
      month = Number(digits.slice(2, 4));
      year = Number(digits.slice(4, 8));
    }

    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
    return `${year}-${this.analyticsPad(month)}-${this.analyticsPad(day)}`;
  }

  private analyticsApiDateToDisplay(apiDate: string): string {
    if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) return '';
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
    const apiDate = input.value;
    if (!apiDate) return;

    if (field === 'from') {
      this.employeeDetailsFrom = apiDate;
      this.employeeDetailsFromDisplay = this.employeeDetailsApiDateToDisplay(apiDate);
    } else {
      this.employeeDetailsTo = apiDate;
      this.employeeDetailsToDisplay = this.employeeDetailsApiDateToDisplay(apiDate);
    }
  }

  onEmployeeDetailsDateInputChanged(event: { field: 'from' | 'to'; value: string }): void {
    if (event.field === 'from') this.employeeDetailsFromDisplay = event.value;
    else this.employeeDetailsToDisplay = event.value;
  }

  private employeeDetailsApiDateToDisplay(apiDate: string): string {
    if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) return '';
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
      .getEmployeeById(employeeId, this.employeeDetailsFrom, this.employeeDetailsTo, this.employeeDetailsPageNumber, this.employeeDetailsPageSize)
      .subscribe({
        next: (response: any) => {
          const data = response?.data || response;
          this.selectedEmployeeForDetails = { ...(this.selectedEmployeeForDetails || {}), ...data } as Employee;
          this.employeeDetailsRaw = data;
          this.employeeDetailsInfo = data;
          const attendanceData = data?.attendance || data?.attendances || null;
          let rows: any[] = [];

          if (attendanceData?.items && Array.isArray(attendanceData.items)) {
            rows = attendanceData.items;
            this.employeeDetailsPageNumber = attendanceData.pageNumber || 1;
            this.employeeDetailsPageSize = attendanceData.pageSize || this.employeeDetailsPageSize;
            this.employeeDetailsTotalCount = attendanceData.totalCount || 0;
            this.employeeDetailsTotalPages = attendanceData.totalPages || 0;
          } else if (Array.isArray(attendanceData)) {
            rows = attendanceData;
            this.employeeDetailsTotalCount = attendanceData.length;
            this.employeeDetailsTotalPages = 1;
          }

          this.employeeDetailsAllRows = rows;
          this.applyEmployeeDetailsStatusFilter();
          this.isLoadingEmployeeDetails = false;
        },
        error: (err: any) => {
          console.error(err);
          this.employeeDetailsRows = [];
          this.errorMessage = err?.error?.message || 'حدث خطأ أثناء تحميل تفاصيل الموظف';
          this.isLoadingEmployeeDetails = false;
        }
      });
  }

  applyEmployeeDetailsDateFilter(): void {
    this.employeeDetailsFrom = this.formatEmployeeDetailsDateToApi(this.employeeDetailsFromDisplay);
    this.employeeDetailsTo = this.formatEmployeeDetailsDateToApi(this.employeeDetailsToDisplay);
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
    const selectedStatus = this.normalizeEmployeeDetailsStatus(this.employeeDetailsStatusFilter);
    this.employeeDetailsRows = this.employeeDetailsAllRows.filter((row) => {
      return this.normalizeEmployeeDetailsStatus(row?.status) === selectedStatus;
    });
  }

  private normalizeEmployeeDetailsStatus(value: unknown): string {
    return String(value ?? '').trim().toLowerCase().replace(/[_\s-]+/g, '');
  }

  formatEmployeeDetailsDateWhileTyping(field: 'from' | 'to'): void {
    const currentValue = field === 'from' ? this.employeeDetailsFromDisplay : this.employeeDetailsToDisplay;
    const normalized = String(currentValue || '').replace(/\D/g, '').slice(0, 8);
    const formatted = normalized.length > 4 ? `${normalized.slice(0, 2)}/${normalized.slice(2, 4)}/${normalized.slice(4)}` : normalized.length > 2 ? `${normalized.slice(0, 2)}/${normalized.slice(2)}` : normalized;

    if (field === 'from') this.employeeDetailsFromDisplay = formatted;
    else this.employeeDetailsToDisplay = formatted;
  }

  private formatEmployeeDetailsDateToApi(value: string): string {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length !== 8) return '';
    return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
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
}