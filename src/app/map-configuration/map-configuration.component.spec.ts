import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapConfigurationComponent } from './map-configuration.component';

describe('MapConfigurationComponent', () => {
  let component: MapConfigurationComponent;
  let fixture: ComponentFixture<MapConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapConfigurationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
