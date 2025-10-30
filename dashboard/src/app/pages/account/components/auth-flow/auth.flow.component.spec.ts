import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountAccessComponent } from './auth.flow.component';

describe('LoginComponent', () => {
  let component: AccountAccessComponent;
  let fixture: ComponentFixture<AccountAccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountAccessComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountAccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
