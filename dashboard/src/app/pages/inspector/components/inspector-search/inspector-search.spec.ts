import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorSearchComponent } from './inspector-search';

describe('InspectorSearchComponent', () => {
  let component: InspectorSearchComponent;
  let fixture: ComponentFixture<InspectorSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorSearchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
