import { Component, Input, OnInit, AfterViewInit, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as mapboxgl from 'mapbox-gl';
import { environment } from '../../environments/environment';
import poultryData from '../../assets/poultry-farms.json';
import { createCustomMarker } from '../custom-marker/custom-marker';
import { MapConfigService, MapConfig } from '../services/map-config.service';

@Component({
  selector: 'app-poultry-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './poultry-map.component.html',
  styleUrls: ['./poultry-map.component.css', '../custom-marker/custom-marker.css']
})
export class PoultryMapComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @Input() mapStyle: string = 'mapbox://styles/mapbox/streets-v12';
  @Input() center: [number, number] = [-96.921387, 36.084621];
  @Input() zoom: number = 8;
  @Input() farms: any[] = poultryData;

  map!: mapboxgl.Map;
  private markers: mapboxgl.Marker[] = [];
  private isMapLoaded = false;
  private popup: mapboxgl.Popup | null = null;

  private config = {
    popup: {
      width: '300px',
      maxWidth: '90vw',
      padding: '12px',
      fontSize: '11px',
      columnGap: '15px',
      backgroundColor: '#fff',
      fields: ['Integrator', 'Registered number of houses', 'Registered number of birds']
    },
    map: {
      defaultCenter: [151.2093, -33.8688] as [number, number],
      defaultZoom: 8,
      defaultStyle: 'mapbox://styles/mapbox/streets-v12'
    },
    cluster: {
      clusterMaxZoom: 14,
      clusterRadius: 50,
      circleColors: ['#51bbd6', '#f1f075', '#f28cb1'],
      circleRadii: [20, 30, 40],
      colorSteps: [100, 750]
    },
    fonts: {
      popupFont: 'Arial, sans-serif',
      clusterFont: ['Open Sans Regular', 'Arial Unicode MS Bold'],
      textSize: 12
    }
  };

  mapStyles: { [key: string]: string } = {
    streets: 'mapbox://styles/mapbox/streets-v12',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    light: 'mapbox://styles/mapbox/light-v11',
    dark: 'mapbox://styles/mapbox/dark-v11',
    satellite: 'mapbox://styles/mapbox/satellite-v9',
    satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
    navigationDay: 'mapbox://styles/mapbox/navigation-day-v1',
    navigationNight: 'mapbox://styles/mapbox/navigation-night-v1'
  };

  constructor(private mapConfigService: MapConfigService) {}

  ngOnInit() {
    console.log('PoultryMapComponent ngOnInit - Farms:', this.farms);
    this.popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: [0, -10]
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['farms'] && this.map && this.isMapLoaded) {
      console.log('Farms changed:', this.farms);
      this.updateMarkers();
    }
  }

  ngAfterViewInit() {
    if (!this.mapContainer?.nativeElement) {
      console.error('Map container not found');
      return;
    }
    console.log('Map container found:', this.mapContainer.nativeElement);
    console.log('Mapbox access token:', environment.mapboxAccessToken ? 'Set' : 'Missing');
    this.mapConfigService.getConfig().subscribe(config => {
      console.log('Received config:', config);
      if (config) {
        this.applySavedConfig(config);
      } else {
        console.warn('Using default config');
        this.mapStyle = this.config.map.defaultStyle;
        this.center = this.config.map.defaultCenter;
        this.zoom = this.config.map.defaultZoom;
      }
      this.initializeMap();
    });
  }

  @Input() set mapStyleName(name: keyof typeof this.mapStyles) {
    if (name && this.mapStyles[name]) {
      this.mapStyle = this.mapStyles[name];
      if (this.map) {
        this.changeMapStyle(this.mapStyle);
      }
    }
  }

  private applySavedConfig(savedConfig: MapConfig) {
    this.mapStyle = this.mapStyles[savedConfig.mapStyleName] || this.config.map.defaultStyle;
    this.center = savedConfig.center;
    this.zoom = savedConfig.zoom;
    this.config.cluster.clusterRadius = savedConfig.clusterRadius;
    this.config.cluster.clusterMaxZoom = savedConfig.clusterMaxZoom;
    this.config.popup.fields = savedConfig.popupFields;
    console.log('Applied config - Style:', this.mapStyle, 'Center:', this.center, 'Zoom:', this.zoom);
  }

  changeMapStyle(styleUrl: string) {
    if (this.map) {
      console.log('Changing map style to:', styleUrl);
      this.clearMarkers();
      this.isMapLoaded = false;
      this.map.setStyle(styleUrl);
      this.map.once('style.load', () => {
        this.isMapLoaded = true;
        this.addClusterSource();
        this.addClusterLayers();
        this.updateMarkers();
      });
    }
  }

  private initializeMap() {
    console.log('Initializing map with center:', this.center, 'zoom:', this.zoom, 'style:', this.mapStyle);
    try {
      this.map = new mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: this.mapStyle,
        center:  this.center,
        zoom: this.zoom,
        accessToken: environment.mapboxAccessToken
      });
      console.log('Map instance created:', this.map);
      this.map.addControl(new mapboxgl.NavigationControl());
      this.map.on('load', () => {
        console.log('Map loaded');
        this.isMapLoaded = true;
        this.addClusterSource();
        this.addClusterLayers();
        this.updateMarkers();
      });
      this.map.on('error', (e) => {
        console.error('Map error:', e);
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  }

  private getFirstFarmCenter(): [number, number] | null {
    if (this.farms.length === 0) {
      console.warn('No farms data available');
      return null;
    }
    const firstFarm = this.farms[0];
    if (this.isValidLatLng(firstFarm.latitude, firstFarm.longitude, firstFarm['Poultry ID'])) {
      return [parseFloat(firstFarm.longitude), parseFloat(firstFarm.latitude)];
    }
    console.warn('Invalid coordinates for first farm:', firstFarm);
    return null;
  }

  private addClusterSource() {
    if (!this.isMapLoaded) {
      console.warn('Map not loaded, skipping cluster source');
      return;
    }
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: this.farms
        .filter(farm => this.isValidLatLng(farm.latitude, farm.longitude, farm['Poultry ID']))
        .map(farm => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(farm.longitude), parseFloat(farm.latitude)]
          },
          properties: farm
        }))
    };
    console.log('Cluster source features:', geojson.features.length);
    if (this.map.getSource('farms')) {
      (this.map.getSource('farms') as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      this.map.addSource('farms', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: this.config.cluster.clusterMaxZoom,
        clusterRadius: this.config.cluster.clusterRadius
      });
    }
  }

  private addClusterLayers() {
    if (!this.isMapLoaded) {
      console.warn('Map not loaded, skipping cluster layers');
      return;
    }
    if (!this.map.getLayer('clusters')) {
      this.map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'farms',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            this.config.cluster.circleColors[0],
            this.config.cluster.colorSteps[0],
            this.config.cluster.circleColors[1],
            this.config.cluster.colorSteps[1],
            this.config.cluster.circleColors[2]
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            this.config.cluster.circleRadii[0],
            this.config.cluster.colorSteps[0],
            this.config.cluster.circleRadii[1],
            this.config.cluster.colorSteps[1],
            this.config.cluster.circleRadii[2]
          ]
        }
      });
    }
    if (!this.map.getLayer('cluster-count')) {
      this.map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'farms',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': this.config.fonts.clusterFont,
          'text-size': this.config.fonts.textSize
        }
      });
    }
    this.map.on('click', 'clusters', (e) => {
      if (!e.features || e.features.length === 0) {
        return;
      }
      const feature = e.features[0];
      const clusterId = feature.properties?.['cluster_id'];
      if (typeof clusterId !== 'number') {
        return;
      }
      const geometry = feature.geometry as GeoJSON.Point;
      if (!geometry.coordinates) {
        return;
      }
      (this.map.getSource('farms') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) {
          console.error('Cluster zoom error:', err);
          return;
        }
        this.map.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: zoom || this.map.getZoom() + 2
        });
      });
    });
    this.map.on('mouseenter', 'clusters', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'clusters', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  private buildPopupContent(properties: any): string {
    let content = `<div style="font-family: ${this.config.fonts.popupFont};">`;
    this.config.popup.fields.forEach(key => {
      const value = properties[key] ?? '-';
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
      content += `<p style="margin: 3px 0; font-size: ${this.config.popup.fontSize};"><strong>${label}:</strong> ${value}</p>`;
    });
    content += '</div>';
    return content;
  }

  private updateMarkers() {
    if (!this.isMapLoaded) {
      console.warn('Map not loaded, skipping markers update');
      return;
    }
    console.log('Updating markers with farms:', this.farms);
    this.clearMarkers();
    this.farms
      .filter(farm => this.isValidLatLng(farm.latitude, farm.longitude, farm['Poultry ID']))
      .forEach(farm => {
        const coordinates: [number, number] = [parseFloat(farm.longitude), parseFloat(farm.latitude)];
        const markerElement = createCustomMarker(farm);
        const marker = new mapboxgl.Marker({ element: markerElement })
          .setLngLat(coordinates)
          .addTo(this.map);

        markerElement.addEventListener('mouseenter', () => {
          this.map.getCanvas().style.cursor = 'pointer';
          if (this.popup) {
            const popupContent = this.buildPopupContent(farm);
            this.popup
              .setLngLat(coordinates)
              .setHTML(popupContent)
              .addTo(this.map);
          }
        });

        markerElement.addEventListener('mouseleave', () => {
          this.map.getCanvas().style.cursor = '';
          if (this.popup) {
            this.popup.remove();
          }
        });

        this.markers.push(marker);
      });
    this.addClusterSource();
  }

  private clearMarkers() {
    console.log('Clearing markers:', this.markers.length);
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
    if (this.popup) {
      this.popup.remove();
    }
  }

  private isValidLatLng(lat: any, lng: any, poultryId: string = 'unknown'): boolean {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const isValid =
      !isNaN(parsedLat) &&
      !isNaN(parsedLng) &&
      parsedLat >= -90 &&
      parsedLat <= 90 &&
      parsedLng >= -180 &&
      parsedLng <= 180;
    if (!isValid) {
      console.warn(`Invalid coordinates for poultry ID ${poultryId}: lat=${lat}, lng=${lng}`);
    }
    return isValid;
  }
}