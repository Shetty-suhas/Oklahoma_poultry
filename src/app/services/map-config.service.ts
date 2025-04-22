import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface MapConfig {
  mapStyleName: string;
  center: [number, number];
  zoom: number;
  clusterRadius: number;
  clusterMaxZoom: number;
  popupFields: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MapConfigService {
  private configUrl = 'assets/config/map-config.json';
  private defaultConfig: MapConfig = {
    mapStyleName: 'streets',
    center: [-94.8945, 36.204182],
    zoom: 8,
    clusterRadius: 50,
    clusterMaxZoom: 14,
    popupFields: ['Integrator', 'Registered number of houses', 'Registered number of birds']
  };
  private currentConfig: MapConfig = { ...this.defaultConfig };
  private configSubject = new BehaviorSubject<MapConfig>({ ...this.currentConfig });

  constructor(private http: HttpClient) {
    console.log('MapConfigService initialized with default config:', this.currentConfig);
    this.loadConfig().subscribe();
  }

  loadConfig(): Observable<MapConfig> {
    return this.http.get<MapConfig>(this.configUrl).pipe(
      tap(config => {
        this.currentConfig = { ...config };
        this.configSubject.next({ ...this.currentConfig });
        console.log('Loaded config from map-config.json:', this.currentConfig);
      }),
      catchError((error: HttpErrorResponse) => {
        console.warn('Failed to load map-config.json, using default config:', error.message);
        this.currentConfig = { ...this.defaultConfig };
        this.configSubject.next({ ...this.currentConfig });
        return of(this.currentConfig);
      })
    );
  }

  getConfig(): Observable<MapConfig> {
    return this.configSubject.asObservable();
  }

  getCurrentConfig(): MapConfig {
    console.log('getCurrentConfig called, returning:', this.currentConfig);
    return { ...this.currentConfig };
  }

  saveConfig(config: MapConfig): Observable<void> {
    this.currentConfig = { ...config };
    this.configSubject.next({ ...this.currentConfig });
    console.log('Configuration updated in memory:', this.currentConfig);
    console.log('To persist changes across sessions, copy the following JSON into src/assets/config/map-config.json:');
    console.log(JSON.stringify(this.currentConfig, null, 2));
    return of(void 0);
  }
}