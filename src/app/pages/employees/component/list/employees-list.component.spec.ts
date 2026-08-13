import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeesListComponent } from './employees-list.component';

describe('EmployeesListComponent', () => {
  let component: EmployeesListComponent;
  let fixture: ComponentFixture<EmployeesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeesListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should disable edit action until a location is selected for super admin', () => {
    component.isSuperAdmin = true;
    component.selectedLocationId = null;

    expect(component.shouldDisableEditAction).toBeTrue();

    component.selectedLocationId = 12;
    expect(component.shouldDisableEditAction).toBeFalse();
  });
});
