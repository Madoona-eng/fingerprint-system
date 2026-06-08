import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { read, utils, WorkBook, WorkSheet } from 'xlsx';

import {
  Employee,
  EmployeePayload,
  BulkImportEmployeePayload,
  EmployeesService
} from '../../services/employees.service';

interface UnknownDepartment {
  key: string;
  name: string;
  id: number | null;
}

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.css'
})
export class EmployeesComponent implements OnInit {
  employees: Employee[] = [];
  employeeForm!: FormGroup;

  isLoading = false;
  isSaving = false;
  isImporting = false;
  hasImportedCurrentSheet = false;

  searchTerm = '';
  pageNumber = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  errorMessage = '';
  successMessage = '';

  selectedEmployeeId: number | null = null;

  selectedEmployeeForDetails: Employee | null = null;
  employeeDetailsRows: any[] = [];

employeeDetailsRaw: any = null;
employeeDetailsInfo: any = null;

  isLoadingEmployeeDetails = false;

  employeeDetailsFrom = '';
  employeeDetailsTo = '';
  employeeDetailsPageNumber = 1;
  employeeDetailsPageSize = 10;
  employeeDetailsTotalCount = 0;
  employeeDetailsTotalPages = 0;

  activeEmployeePage: 'upload' | 'list' | 'form' | 'details' = 'upload';

  excelEmployees: Employee[] = [];
  excelFileName = '';
  excelErrorMessage = '';
  excelSuccessMessage = '';
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
  departmentOptions: { id: number; name: string }[] = [
  { id: 1, name: 'إدارة الأزمات' },
  { id: 2, name: 'الاتصال السياسي' },
  { id: 3, name: 'الإدارة العامة للتنمية' },
  { id: 4, name: 'الاستثمار' },
  { id: 5, name: 'الإسكان' },
  { id: 6, name: 'الإعلانات' },
  { id: 7, name: 'الأمن' },
  { id: 8, name: 'الأمومة والطفولة' },
  { id: 9, name: 'التخطيط العمراني' },
  { id: 10, name: 'التخطيط والمتابعة' },
  { id: 11, name: 'التنمية الحضارية' },
  { id: 12, name: 'التوريدات' },
  { id: 13, name: 'الحجز الإداري' },
  { id: 14, name: 'الحسابات' },
  { id: 15, name: 'الحوكمة' },
  { id: 16, name: 'الخزينة' },
  { id: 17, name: 'الرصد الإعلامي' },
  { id: 18, name: 'السياحة' },
  { id: 19, name: 'الشؤون الإدارية' },
  { id: 20, name: 'الشؤون المالية' },
  { id: 21, name: 'الشؤون القانونية' },
  { id: 22, name: 'الصندوق التأميني' },
  { id: 23, name: 'العلاقات الدولية' },
  { id: 24, name: 'العلاقات العامة' },
  { id: 25, name: 'المتغيرات المكانية' },
  { id: 26, name: 'المخازن' },
  { id: 27, name: 'المركبات' },
  { id: 28, name: 'المكتب الفني' },
  { id: 29, name: 'الموارد البشرية' },
  { id: 30, name: 'الهيئة الموازنية' },
  { id: 31, name: 'ترشيد الطاقة' },
  { id: 32, name: 'حساب الخدمات' },
  { id: 33, name: 'خدمة المواطنين' },
  { id: 34, name: 'شؤون المجالس' },
  { id: 35, name: 'شؤون المقر' },
  { id: 36, name: 'صندوق الخدمات' },
  { id: 37, name: 'فض المنازعات' },
  { id: 38, name: 'مكتب الإعلام' },
  { id: 39, name: 'مكتب المستشار القضائي' },
  { id: 40, name: 'مكتب مفوض الدولة' }
];
getDepartmentNameById(id: number | null | undefined): string {
  if (!id) {
    return '';
  }

  return this.departmentOptions.find((dep) => dep.id === Number(id))?.name || '';
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
    private employeesService: EmployeesService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadEmployees();
  }

  openEmployeePage(page: 'upload' | 'list' | 'form' | 'details'): void {
    this.activeEmployeePage = page;

    if (page === 'list') {
      this.loadEmployees();
    }

    if (page === 'form') {
      this.selectedEmployeeId = null;
      this.employeeForm.reset();
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  initForm(): void {
    this.employeeForm = this.fb.group({
      employeeCode: ['', Validators.required],
      name: ['', Validators.required],
      departmentId: [null, Validators.required],
      scheduleIn: ['', Validators.required],
      scheduleOut: ['', Validators.required],
      graceTime: ['', Validators.required]
    });
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.employeesService
      .getEmployees(this.searchTerm, this.pageNumber, this.pageSize)
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

          this.employees = items || [];

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

openEmployeeDetails(employee: Employee): void {
  if (!employee.id) {
    this.errorMessage = 'لا يمكن عرض تفاصيل هذا الموظف لأن رقم ID غير موجود';
    return;
  }

  this.selectedEmployeeForDetails = employee;
  this.employeeDetailsPageNumber = 1;
  this.employeeDetailsRows = [];
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
    this.errorMessage = 'اختاري موظف أولًا لعرض التفاصيل';
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

        this.employeeDetailsRaw = data;
        this.employeeDetailsInfo = data;

        const attendanceData =
          data?.attendance ||
          data?.attendances ||
          data?.attendanceData ||
          null;

        if (attendanceData?.items && Array.isArray(attendanceData.items)) {
          this.employeeDetailsRows = attendanceData.items;
          this.employeeDetailsPageNumber = attendanceData.pageNumber || 1;
          this.employeeDetailsPageSize =
            attendanceData.pageSize || this.employeeDetailsPageSize;
          this.employeeDetailsTotalCount = attendanceData.totalCount || 0;
          this.employeeDetailsTotalPages = attendanceData.totalPages || 0;
        } else if (Array.isArray(attendanceData)) {
          this.employeeDetailsRows = attendanceData;
          this.employeeDetailsTotalCount = attendanceData.length;
          this.employeeDetailsTotalPages = 1;
        } else {
          this.employeeDetailsRows = [];
          this.employeeDetailsTotalCount = 0;
          this.employeeDetailsTotalPages = 0;
        }

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
    this.employeeDetailsPageNumber = 1;
    this.loadEmployeeDetails();
  }

  clearEmployeeDetailsDateFilter(): void {
    this.employeeDetailsFrom = '';
    this.employeeDetailsTo = '';
    this.employeeDetailsPageNumber = 1;
    this.loadEmployeeDetails();
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

  saveEmployee(): void {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      this.errorMessage = 'من فضلك اكملي كل بيانات الموظف';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const employee = this.getEmployeePayloadFromForm();

    console.log('Employee Payload Sent:', employee);

    if (!employee.employeeCode) {
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

    if (this.selectedEmployeeId !== null) {
      this.employeesService.updateEmployee(this.selectedEmployeeId, employee).subscribe({
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
      scheduleIn: this.normalizeExcelTime(this.employeeForm.value.scheduleIn),
      scheduleOut: this.normalizeExcelTime(this.employeeForm.value.scheduleOut),
      graceTime: this.normalizeExcelTime(this.employeeForm.value.graceTime)
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

    this.employeeForm.patchValue({
      employeeCode: employee.employeeCode,
      name: employee.name,
      departmentId: departmentId || null,
      scheduleIn: this.timeForInput(employee.scheduleIn),
      scheduleOut: this.timeForInput(employee.scheduleOut),
      graceTime: this.timeForInput(employee.graceTime)
    });

    this.successMessage = '';
    this.errorMessage = '';

    console.log('Editing Employee:', employee);
    console.log('Selected Employee ID:', this.selectedEmployeeId);
    console.log('Resolved Department ID:', departmentId);

    this.activeEmployeePage = 'form';
  }

  cancelEdit(): void {
    this.selectedEmployeeId = null;
    this.employeeForm.reset();
    this.errorMessage = '';
    this.successMessage = '';
    this.activeEmployeePage = 'list';
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
      this.excelErrorMessage = 'من فضلك ارفعي ملف Excel بصيغة xlsx أو xls فقط';
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

    if (!employeeCode || !name) {
      return null;
    }

    return {
      employeeCode,
      name,
      departmentId: 0,
      departmentName,
      scheduleIn: this.normalizeExcelTime(scheduleInRaw),
      scheduleOut: this.normalizeExcelTime(scheduleOutRaw),
      graceTime: this.calculateGraceTime(scheduleInRaw, graceRaw)
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
      scheduleIn: employee.scheduleIn,
      scheduleOut: employee.scheduleOut,
      graceTime: employee.graceTime
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