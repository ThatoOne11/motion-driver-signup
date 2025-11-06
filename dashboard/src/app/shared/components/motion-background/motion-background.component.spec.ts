import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MotionBackgroundComponent } from './motion-background.component';

describe('MotionBackgroundComponent', () => {
  let component: MotionBackgroundComponent;
  let fixture: ComponentFixture<MotionBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MotionBackgroundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MotionBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
