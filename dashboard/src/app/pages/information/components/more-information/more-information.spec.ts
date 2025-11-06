import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoreInformation } from './more-information';

describe('MoreInformation', () => {
  let component: MoreInformation;
  let fixture: ComponentFixture<MoreInformation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoreInformation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoreInformation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
