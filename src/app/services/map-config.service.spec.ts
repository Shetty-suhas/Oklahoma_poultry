import { TestBed } from '@angular/core/testing';

import { MapConfigService } from './map-config.service';

describe('MapConfigService', () => {
  let service: MapConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
