import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnboardingSignUp } from './onboarding-sign-up';

describe('OnboardingSignUp', () => {
  let component: OnboardingSignUp;
  let fixture: ComponentFixture<OnboardingSignUp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingSignUp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnboardingSignUp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
