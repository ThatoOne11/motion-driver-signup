import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailPassthrough } from './email-passthrough';

describe('EmailPassthrough', () => {
  let component: EmailPassthrough;
  let fixture: ComponentFixture<EmailPassthrough>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailPassthrough]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailPassthrough);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
