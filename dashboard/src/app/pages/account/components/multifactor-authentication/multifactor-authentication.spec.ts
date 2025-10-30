import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultifactorAuthentication } from './multifactor-authentication';

describe('MultifactorAuthentication', () => {
  let component: MultifactorAuthentication;
  let fixture: ComponentFixture<MultifactorAuthentication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultifactorAuthentication]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultifactorAuthentication);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
