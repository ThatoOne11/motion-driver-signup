import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogNoAuthenticator } from './dialog-no-authenticator';

describe('DialogNoAuthenticator', () => {
  let component: DialogNoAuthenticator;
  let fixture: ComponentFixture<DialogNoAuthenticator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogNoAuthenticator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogNoAuthenticator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
