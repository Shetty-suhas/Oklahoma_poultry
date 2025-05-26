import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface MapConfig {
  name: string;
  mapStyleName: string;
  center: [number, number];
  zoom: number;
  clusterRadius: number;
  clusterMaxZoom: number;
  configurationName: string;
  markerDesignName: string;
}

export interface Configuration {
  collectionName: string;
  configurationName: string;
  selectedColumns: string[];
  renames: { original: string; renamed: string }[];
}

export interface MarkerDesign {
  name: string;
  svg: string;
}

@Injectable({
  providedIn: 'root'
})
export class MapConfigService {
  private apiUrl = 'https://my-flask-app-1033096764168.asia-south1.run.app/';

  constructor(private http: HttpClient) {}

  getConfig(configName?: string): Observable<MapConfig | null> {
    if (!configName) {
      return of(null);
    }
    return this.http.get<MapConfig>(`${this.apiUrl}/map-config/${configName}`).pipe(
      catchError((error) => {
        console.error('Error fetching map config:', error);
        return of(null);
      })
    );
  }

  getConfiguration(configurationName: string): Observable<Configuration | null> {
    return this.http.get<Configuration>(`${this.apiUrl}/config/${configurationName}`).pipe(
      catchError((error) => {
        console.error('Error fetching configuration:', error);
        return of(null);
      })
    );
  }

  getMarkerDesign(markerDesignName: string): Observable<MarkerDesign | null> {
    return this.http.get<{ markerDesign: MarkerDesign }>(`${this.apiUrl}/marker-design/${markerDesignName}`).pipe(
      map(response => response.markerDesign),
      catchError((error) => {
        console.error('Error fetching marker design:', error);
        return of(null);
      })
    );
  }

  getData(collectionName: string): Observable<any[]> {
    return this.http.get<{ data: any[] }>(`${this.apiUrl}/poultry-data/${collectionName}?per_page=1000`).pipe(
      map(response => response.data),
      catchError((error) => {
        console.error('Error fetching data:', error);
        return of([]);
      })
    );
  }
}