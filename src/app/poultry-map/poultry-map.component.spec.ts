import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PoultryMapComponent } from './poultry-map.component';
import { CommonModule } from '@angular/common';
import * as mapboxgl from 'mapbox-gl';

describe('PoultryMapComponent', () => {
  let component: PoultryMapComponent;
  let fixture: ComponentFixture<PoultryMapComponent>;

  beforeEach(async () => {
    // Mock mapbox-gl
    spyOn(mapboxgl, 'Map').and.returnValue({
      addControl: jasmine.createSpy('addControl'),
      on: jasmine.createSpy('on'),
      remove: jasmine.createSpy('remove')
    } as any);

    await TestBed.configureTestingModule({
      imports: [CommonModule, PoultryMapComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PoultryMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});