import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogNeedHelp } from './dialog-need-help';

describe('DialogNeedHelp', () => {
  let component: DialogNeedHelp;
  let fixture: ComponentFixture<DialogNeedHelp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogNeedHelp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogNeedHelp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
