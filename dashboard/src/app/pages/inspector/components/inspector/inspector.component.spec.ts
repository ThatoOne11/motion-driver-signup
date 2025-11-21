import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorComponent } from './inspector.component';
import { InspectorOptionsService } from '../../service/inspector-options.service';
import { InspectorSearchService } from '../../service/inspector-search.service';
import { InspectorSignUpService } from '../../service/inspector-sign-up.service';

describe('InspectorComponent', () => {
  let component: InspectorComponent;
  let fixture: ComponentFixture<InspectorComponent>;
  const inspectorOptionsServiceStub = {
    getInspectorOptions: jasmine
      .createSpy('getInspectorOptions')
      .and.returnValue(Promise.resolve([])),
  };
  const inspectorSearchServiceStub = {
    searchInspectorMatches: jasmine
      .createSpy('searchInspectorMatches')
      .and.returnValue(
        Promise.resolve({ matches: [], matchCount: 0, hasErrors: false }),
      ),
  };
  const inspectorSignUpServiceStub = {
    registerInspectorDriver: jasmine
      .createSpy('registerInspectorDriver')
      .and.returnValue(Promise.resolve()),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorComponent],
      providers: [
        {
          provide: InspectorOptionsService,
          useValue: inspectorOptionsServiceStub,
        },
        {
          provide: InspectorSearchService,
          useValue: inspectorSearchServiceStub,
        },
        {
          provide: InspectorSignUpService,
          useValue: inspectorSignUpServiceStub,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
