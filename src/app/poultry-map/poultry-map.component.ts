import { Component, Input, OnInit, AfterViewInit, ViewChild, ElementRef, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import * as mapboxgl from 'mapbox-gl';
import { environment } from '../../environments/environment';
import { createCustomMarker } from '../custom-marker/custom-marker';
import { MapConfigService, MapConfig, MarkerDesign } from '../services/map-config.service';
import { Subscription } from 'rxjs';

interface FieldConfig {
  collectionName: string;
  configurationName: string;
  selectedColumns: string[];
  renames: { original: string; renamed: string }[];
}

@Component({
  selector: 'app-poultry-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './poultry-map.component.html',
  styleUrls: ['./poultry-map.component.css', '../custom-marker/custom-marker.css']
})
export class PoultryMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @Input() selectedConfiguration: string = '';

  map?: mapboxgl.Map;
  private markers: mapboxgl.Marker[] = [];
  private isMapLoaded = false;
  private popup: mapboxgl.Popup | null = null;
  private farms: any[] = [];
  private configuration: FieldConfig | null = null;
  private markerSvg: string = '';
  private mapStyle: string | null = null;
  private center: [number, number] | null = null;
  private zoom: number | null = null;
  private clusterRadius: number | null = null;
  private clusterMaxZoom: number | null = null;
  private subscriptions: Subscription[] = [];
  private currentAppliedConfig: string = '';

  private mapStyles: { [key: string]: string } = {
    streets: 'mapbox://styles/mapbox/streets-v12',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    light: 'mapbox://styles/mapbox/light-v11',
    dark: 'mapbox://styles/mapbox/dark-v11',
    satellite: 'mapbox://styles/mapbox/satellite-v9',
    satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
    navigationDay: 'mapbox://styles/mapbox/navigation-day-v1',
    navigationNight: 'mapbox://styles/mapbox/navigation-night-v1'
  };

  private popupConfig = {
    width: '300px',
    maxWidth: '90vw',
    padding: '12px',
    fontSize: '11px',
    columnGap: '15px',
    backgroundColor: '#fff',
    font: 'Arial, sans-serif'
  };

  private clusterConfig = {
    circleColors: ['#51bbd6', '#f1f075', '#f28cb1'],
    circleRadii: [20, 30, 40],
    colorSteps: [100, 750],
    textFont: ['Open Sans Regular', 'Arial Unicode MS Bold'],
    textSize: 12
  };

  constructor(
    private mapConfigService: MapConfigService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      offset: [0, -10],
      maxWidth: this.popupConfig.maxWidth
    });
    this.loadConfiguration();
  }

  ngAfterViewInit() {
    if (!this.mapContainer?.nativeElement) {
      console.error('Map container not found');
      return;
    }
    this.loadConfiguration();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.map) {
      this.map.remove();
    }
    if (this.popup) {
      this.popup.remove();
    }
  }

  private loadConfiguration() {
    this.subscriptions.push(
      this.http.get<MapConfig>('https://my-flask-app-1033096764168.asia-south1.run.app/get-selected-map-config').subscribe({
        next: (mapConfig) => {
          if (!mapConfig) {
            console.error('Invalid or missing map configuration');
            this.clearMap();
            return;
          }
          this.applyMapConfig(mapConfig);
          if (mapConfig.configurationName) {
            this.subscriptions.push(
              this.http.get<FieldConfig>(`https://my-flask-app-1033096764168.asia-south1.run.app/configurations/${mapConfig.configurationName}`).subscribe({
                next: (fieldConfig) => {
                  this.configuration = fieldConfig;
                  if (fieldConfig?.collectionName && fieldConfig.selectedColumns.length) {
                    this.loadCollectionData(fieldConfig.collectionName, fieldConfig.selectedColumns);
                  }
                },
                error: (err) => console.error('Failed to load field configuration:', err)
              })
            );
          }
          if (mapConfig.markerDesignName) {
            this.subscriptions.push(
              this.mapConfigService.getMarkerDesign(mapConfig.markerDesignName).subscribe({
                next: (design) => {
                  this.markerSvg = design?.svg || '';
                  if (this.isMapLoaded) {
                    this.updateMarkers();
                  }
                },
                error: () => console.error('Failed to load marker design')
              })
            );
          }
          if (!this.isMapLoaded && this.canInitializeMap()) {
            this.initializeMap();
          } else if (this.isMapLoaded) {
            this.updateMap();
          }
        },
        error: () => {
          console.error('Failed to load map configuration');
          this.clearMap();
        }
      })
    );
  }

  private loadCollectionData(collectionName: string, selectedColumns: string[]) {
    const requestBody = {
      fields: selectedColumns
    };
    console.log('Request body:', requestBody);
    this.subscriptions.push(
      this.http.post<any[]>(`https://my-flask-app-1033096764168.asia-south1.run.app/collections/${collectionName}`, requestBody).subscribe({
        next: (data) => {
          this.farms = data;
          console.log('Loaded collection data:', this.farms);
          if (this.isMapLoaded) {
            this.updateMap();
          }
        },
        error: (err) => console.error('Failed to load collection data:', err)
      })
    );
  }

  private applyMapConfig(mapConfig: MapConfig) {
    this.mapStyle = this.mapStyles[mapConfig.mapStyleName];
    if (!this.mapStyle) {
      console.error(`Invalid map style: ${mapConfig.mapStyleName}`);
      this.mapStyle = null;
    }
    this.center = mapConfig.center;
    this.zoom = mapConfig.zoom;
    this.clusterRadius = mapConfig.clusterRadius;
    this.clusterMaxZoom = mapConfig.clusterMaxZoom;
    console.log('Applied map config:', mapConfig);
  }

  private canInitializeMap(): boolean {
    return !!(
      this.mapStyle &&
      this.center &&
      this.zoom !== null &&
      this.clusterRadius !== null &&
      this.clusterMaxZoom !== null &&
      this.mapContainer?.nativeElement
    );
  }

  private clearMap() {
    this.farms = [];
    this.configuration = null;
    this.markerSvg = '';
    this.mapStyle = null;
    this.center = null;
    this.zoom = null;
    this.clusterRadius = null;
    this.clusterMaxZoom = null;
    if (this.isMapLoaded) {
      this.clearMarkers();
      this.isMapLoaded = false;
      if (this.map) {
        this.map.remove();
        this.map = undefined;
      }
    }
  }

  private updateMap() {
    if (!this.isMapLoaded || !this.canInitializeMap()) {
      console.warn('Cannot update map, invalid state');
      return;
    }
    this.map!.setStyle(this.mapStyle!);
    this.map!.setCenter(this.center!);
    this.map!.setZoom(this.zoom!);
    this.map!.once('style.load', () => {
      this.isMapLoaded = true;
      this.addClusterSource();
      this.addClusterLayers();
      this.updateMarkers();
    });
  }

  private initializeMap() {
    if (!this.canInitializeMap()) {
      console.error('Cannot initialize map, missing required configuration');
      return;
    }
    try {
      this.map = new mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: this.mapStyle!,
        center: this.center!,
        zoom: this.zoom!,
        accessToken: environment.mapboxAccessToken
      });
      this.map.addControl(new mapboxgl.NavigationControl());
      this.map.on('load', () => {
        console.log('Map loaded');
        this.isMapLoaded = true;
        this.addClusterSource();
        this.addClusterLayers();
        this.updateMarkers();
      });
      this.map.on('error', (e) => console.error('Map error:', e));
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  }

  private addClusterSource() {
    if (!this.isMapLoaded) {
      return;
    }
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: this.farms
        .filter(farm => this.isValidLatLng(farm))
        .map(farm => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [this.getLongitude(farm)!, this.getLatitude(farm)!]
          },
          properties: farm
        }))
    };
    if (this.map!.getSource('farms')) {
      (this.map!.getSource('farms') as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      this.map!.addSource('farms', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: this.clusterMaxZoom!,
        clusterRadius: this.clusterRadius!
      });
    }
  }

  private addClusterLayers() {
    if (!this.isMapLoaded || this.map!.getLayer('clusters')) {
      return;
    }
    this.map!.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'farms',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          this.clusterConfig.circleColors[0],
          this.clusterConfig.colorSteps[0],
          this.clusterConfig.circleColors[1],
          this.clusterConfig.colorSteps[1],
          this.clusterConfig.circleColors[2]
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          this.clusterConfig.circleRadii[0],
          this.clusterConfig.colorSteps[0],
          this.clusterConfig.circleRadii[1],
          this.clusterConfig.colorSteps[1],
          this.clusterConfig.circleRadii[2]
        ]
      }
    });
    this.map!.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'farms',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': this.clusterConfig.textFont,
        'text-size': this.clusterConfig.textSize
      }
    });
    this.map!.on('click', 'clusters', (e) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const clusterId = feature.properties?.['cluster_id'];
      if (typeof clusterId !== 'number') return;
      const geometry = feature.geometry as GeoJSON.Point;
      (this.map!.getSource('farms') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) {
          console.error('Cluster zoom error:', err);
          return;
        }
        this.map!.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: zoom || this.map!.getZoom() + 1
        });
      });
    });
    this.map!.on('mouseenter', 'clusters', () => {
      this.map!.getCanvas().style.cursor = 'pointer';
    });
    this.map!.on('mouseleave', 'clusters', () => {
      this.map!.getCanvas().style.cursor = '';
    });
  }

  private buildPopupContent(properties: any): string {
    let content = `<div style="font-family:${this.popupConfig.font};width:${this.popupConfig.width};max-width:${this.popupConfig.maxWidth};padding:${this.popupConfig.padding};background:${this.popupConfig.backgroundColor};font-size:${this.popupConfig.fontSize};display:grid;grid-template-columns:1fr;gap:${this.popupConfig.columnGap};">`;
    
    const fields = this.configuration?.selectedColumns || [];
    const renameMap = new Map<string, string>();
    
    // Build rename map using both original and renamed as keys
    this.configuration?.renames?.forEach(r => {
        renameMap.set(r.original, r.renamed);
        // Also map the renamed version back to itself for consistency
        renameMap.set(r.renamed, r.renamed);
    });
    
    // Normalize field names for comparison (same logic as backend)
    const normalizeField = (field: string): string => {
        return field.replace(/\s+/g, ' ').trim();
    };
    
    // Create a map of normalized property keys to actual property keys
    const propertyKeyMap = new Map<string, string>();
    Object.keys(properties).forEach(key => {
        const normalized = normalizeField(key);
        propertyKeyMap.set(normalized, key);
    });
    
    fields.forEach(requestedField => {
        let actualPropertyKey = requestedField;
        let foundValue = properties[requestedField];
        
        // If direct match doesn't work, try normalized matching
        if (foundValue === undefined) {
            const normalizedRequested = normalizeField(requestedField);
            const matchingKey = propertyKeyMap.get(normalizedRequested);
            if (matchingKey) {
                actualPropertyKey = matchingKey;
                foundValue = properties[matchingKey];
            }
        }
        
        if (foundValue !== undefined) {
            let value: string;
            if (foundValue == null || typeof foundValue === 'object' || (typeof foundValue === 'number' && isNaN(foundValue))) {
                value = '-';
            } else {
                value = foundValue.toString();
            }
            let label = renameMap.get(requestedField) || renameMap.get(actualPropertyKey);
            
            if (!label) {
                label = requestedField
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/_/g, ' ')
                    .replace(/\n/g, ' ') // Handle line breaks
                    .replace(/\s+/g, ' ') // Normalize spaces
                    .replace(/\b\w/g, c => c.toUpperCase())
                    .trim();
            }
            
            content += `<p style="margin:0;font-size:${this.popupConfig.fontSize};"><strong>${label}:</strong> ${value}</p>`;
        }
    });
    
    content += '</div>';
    return content;
}

  private updateMarkers() {
    if (!this.isMapLoaded) {
      return;
    }
    this.clearMarkers();
    this.farms
      .filter(farm => this.isValidLatLng(farm))
      .forEach(farm => {
        const coordinates: [number, number] = [this.getLongitude(farm)!, this.getLatitude(farm)!];
        const markerElement = createCustomMarker(farm, this.markerSvg);
        const marker = new mapboxgl.Marker({ element: markerElement })
          .setLngLat(coordinates)
          .addTo(this.map!);
        markerElement.addEventListener('mouseenter', () => {
          this.map!.getCanvas().style.cursor = 'pointer';
          if (this.popup) {
            // Close any existing popup
            this.popup.remove();
            // Create new popup content
            const content = this.buildPopupContent(farm);
            this.popup
              .setLngLat(coordinates)
              .setHTML(content)
              .addTo(this.map!);
          }
        });
        markerElement.addEventListener('mouseleave', () => {
          this.map!.getCanvas().style.cursor = '';
          if (this.popup) {
            this.popup.remove();
          }
        });
        this.markers.push(marker);
      });
    this.addClusterSource();
  }

  private clearMarkers() {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
    if (this.popup) {
      this.popup.remove();
    }
  }

  private isValidLatLng(farm: any): boolean {
    const lat = this.getLatitude(farm);
    const lng = this.getLongitude(farm);
    return (
      lat !== null &&
      lng !== null &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  private getLatitude(farm: any): number | null {
    const latKeys = ['latitude', 'Latitude', 'LATITUDE'];
    for (const key of latKeys) {
      if (farm[key] && !isNaN(parseFloat(farm[key]))) {
        return parseFloat(farm[key]);
      }
    }
    return null;
  }

  private getLongitude(farm: any): number | null {
    const lonKeys = ['longitude', 'Longitude', 'LONGITUDE'];
    for (const key of lonKeys) {
      if (farm[key] && !isNaN(parseFloat(farm[key]))) {
        return parseFloat(farm[key]);
      }
    }
    return null;
  }
}