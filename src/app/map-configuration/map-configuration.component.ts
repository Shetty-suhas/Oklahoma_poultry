import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MapConfigService, MapConfig } from '../services/map-config.service';

interface CsvMapping {
  latitude: string;
  longitude: string;
  [key: string]: string;
}

@Component({
  selector: 'app-map-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-configuration.component.html',
  styleUrls: ['./map-configuration.component.css']
})
export class MapConfigurationComponent implements OnInit {
  config: MapConfig;

  csvFile: File | null = null;
  csvHeaders: string[] = [];
  csvPreviewData: any[] = [];
  csvMapping: CsvMapping = {
    latitude: '',
    longitude: ''
  };
  csvImportStep = 1;
  csvImportError = '';
  isProcessingCsv = false;

  availableMapStyles: { id: string; name: string; imagePath: string }[] = [
    { id: 'streets', name: 'Streets', imagePath: 'assets/mapstyles/streets.png' },
    { id: 'outdoors', name: 'Outdoors', imagePath: 'assets/mapstyles/outdoors.png' },
    { id: 'light', name: 'Light', imagePath: 'assets/mapstyles/light.png' },
    { id: 'dark', name: 'Dark', imagePath: 'assets/mapstyles/dark.png' },
    { id: 'satellite', name: 'Satellite', imagePath: 'assets/mapstyles/satellite.png' },
    { id: 'satelliteStreets', name: 'Satellite Streets', imagePath: 'assets/mapstyles/satellitestreets.png' },
    { id: 'navigationDay', name: 'Navigation Day', imagePath: 'assets/mapstyles/navigationday.png' },
    { id: 'navigationNight', name: 'Navigation Night', imagePath: 'assets/mapstyles/navigationnight.png' }
  ];

  availablePopupFields: string[] = [
    'Poultry Id',
    'Integrator',
    'Last fac first',
    'first',
    'Operation name',
    'Operator',
    'Address',
    'City state zip',
    'State',
    'Zip',
    'Primary phone',
    'Secondary phone',
    'Inspector',
    'Transfer from',
    'Transfer to',
    'Type',
    'Original registration date',
    'Original issue date',
    'Expansion date',
    'Operator change date',
    'Registered number of houses',
    'Registered number of birds',
    'integrator id',
    'applicator id',
    'check 62',
    'date inactivated',
    'status',
    'last inspected',
    'renewal year',
    'renewal date',
    'renewal total houses',
    'renewal total birds',
    'Actual number of total flocks housed previous year',
    'Actual number of total birds housed previous year',
    'receipt',
    'expiration date',
    'original awmp',
    'revised awmp',
    'awmp due date',
    'letter of request on file',
    'awmp',
    'former operator',
    'date of expansion',
    'proposed birds',
    'proposed houses',
    'current birds',
    'current houses',
    'new or expanding',
    'location audit',
    'proposed expansion new farm date',
    'renewal info',
    'AWMP.1',
    'activity',
    'registration application',
    'annual inspection',
    'farm type',
    'lat long copy',
    'annual report received',
    'report received date',
    'report year',
    'frame 197',
    'no litter applied',
    'followup check',
    'central collection point',
    'continuous roof multi barn',
    'plan request sent date',
    'transfer date',
    'houses span tws or county',
    'agpdes info',
    'npdes number',
    'agpdes name',
    'renewal fee',
    'huc 8',
    'huc 10',
    'huc 12'
  ];

  constructor(private router: Router, private mapConfigService: MapConfigService) {
    this.config = { ...this.mapConfigService.getCurrentConfig() };
    this.config.popupFields = ['Integrator', 'Registered number of houses', 'Registered number of birds'];
    console.log('Constructor: Form initialized with config:', this.config);
  }

  ngOnInit(): void {
    this.mapConfigService.getConfig().subscribe(config => {
      this.config = {
        ...config,
        popupFields: config.popupFields.length > 0 ? config.popupFields : ['Integrator', 'Registered number of houses', 'Registered number of birds']
      };
      console.log('ngOnInit: Form updated with config:', this.config);
    });
  }

  getImagePath(styleId: string): string {
    return `assets/${styleId.toLowerCase()}.png`;
  }

  updateCenter(): void {
    const lon = parseFloat(this.config.center[0].toString());
    const lat = parseFloat(this.config.center[1].toString());
    if (isNaN(lon) || isNaN(lat)) {
      console.warn('Invalid center coordinates:', this.config.center);
      this.config.center = [-94.8945, 36.204182]; // Fallback to default
    } else {
      this.config.center[0] = Math.max(-180, Math.min(180, lon));
      this.config.center[1] = Math.max(-90, Math.min(90, lat));
    }
    console.log('updateCenter: Updated center:', this.config.center);
  }

  isInvalidCoordinate(type: 'longitude' | 'latitude'): boolean {
    const value = parseFloat(this.config.center[type === 'longitude' ? 0 : 1].toString());
    if (isNaN(value)) return true;
    if (type === 'longitude') return value < -180 || value > 180;
    return value < -90 || value > 90;
  }

  togglePopupField(field: string): void {
    const index = this.config.popupFields.indexOf(field);
    if (index === -1) {
      this.config.popupFields.push(field);
    } else {
      this.config.popupFields.splice(index, 1);
    }
    console.log('togglePopupField: Updated popupFields:', this.config.popupFields);
  }

  isFieldSelected(field: string): boolean {
    return this.config.popupFields.includes(field);
  }

  saveConfiguration(): void {
    this.updateCenter(); // Validate center before saving
    this.mapConfigService.saveConfig(this.config).subscribe(() => {
      alert('Configuration updated in memory.');
      this.router.navigate(['/']);
    });
  }

  resetToDefaults(): void {
    this.config = {
      mapStyleName: 'streets',
      center: [-94.8945, 36.204182],
      zoom: 8,
      clusterRadius: 50,
      clusterMaxZoom: 14,
      popupFields: ['Integrator', 'Registered number of houses', 'Registered number of birds']
    };
    this.mapConfigService.saveConfig(this.config).subscribe(() => {
      alert('Configuration reset and updated in memory.');
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.csvFile = null;
      return;
    }

    this.csvFile = input.files[0];
    this.csvImportError = '';
    this.csvHeaders = [];
    this.csvPreviewData = [];
    this.csvMapping = { latitude: '', longitude: '' };
    this.csvImportStep = 1;
  }

  processCsvFile(): void {
    if (!this.csvFile) {
      this.csvImportError = 'Please select a CSV file first';
      return;
    }

    this.isProcessingCsv = true;
    this.csvImportError = '';

    const reader = new FileReader();
    reader.readAsText(this.csvFile);
    reader.onload = () => {
      try {
        const csvData = reader.result as string;
        const result = this.parseCsv(csvData);
        
        this.csvHeaders = result.headers;
        this.csvPreviewData = result.data.slice(0, 5);
        
        this.csvMapping = { latitude: '', longitude: '' };
        this.autoDetectCoordinateColumns();
        
        this.csvImportStep = 2;
        this.isProcessingCsv = false;
      } catch (error) {
        this.csvImportError = 'Error parsing CSV file. Please check the format.';
        this.isProcessingCsv = false;
        console.error('CSV parsing error:', error);
      }
    };
    
    reader.onerror = () => {
      this.csvImportError = 'Error reading the file';
      this.isProcessingCsv = false;
    };
  }

  parseCsv(csvText: string): { headers: string[], data: any[] } {
    const lines = csvText.split(/\r\n|\n/);
    const headers = lines[0].split(',').map(header => header.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      const row: any = {};
      
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] ? values[j].trim() : '';
      }
      
      data.push(row);
    }
    
    return { headers, data };
  }

  autoDetectCoordinateColumns(): void {
    const latitudePatterns = ['lat', 'latitude', 'y'];
    for (const header of this.csvHeaders) {
      const headerLower = header.toLowerCase();
      if (latitudePatterns.some(pattern => headerLower.includes(pattern))) {
        this.csvMapping.latitude = header;
        break;
      }
    }
    
    const longitudePatterns = ['lon', 'lng', 'longitude', 'x'];
    for (const header of this.csvHeaders) {
      const headerLower = header.toLowerCase();
      if (longitudePatterns.some(pattern => headerLower.includes(pattern))) {
        this.csvMapping.longitude = header;
        break;
      }
    }
  }

  validateMapping(): boolean {
    if (!this.csvMapping.latitude || !this.csvMapping.longitude) {
      this.csvImportError = 'Please map both latitude and longitude fields';
      return false;
    }
    return true;
  }

  importCsvData(): void {
    if (!this.validateMapping()) return;
    
    this.isProcessingCsv = true;
    
    const reader = new FileReader();
    reader.readAsText(this.csvFile!);
    reader.onload = () => {
      try {
        const csvData = reader.result as string;
        const result = this.parseCsv(csvData);
        
        const processedData = this.processImportedData(result.data);
        
        localStorage.setItem('importedPoultryData', JSON.stringify(processedData));
        
        this.csvImportStep = 3;
        this.isProcessingCsv = false;
        
        if (processedData.length > 0) {
          this.updateAvailablePopupFields(Object.keys(processedData[0]));
        }
      } catch (error) {
        this.csvImportError = 'Error processing CSV data';
        this.isProcessingCsv = false;
        console.error('CSV processing error:', error);
      }
    };
  }

  processImportedData(data: any[]): any[] {
    return data.map(row => {
      const lat = parseFloat(row[this.csvMapping.latitude]);
      const lng = parseFloat(row[this.csvMapping.longitude]);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return null;
      }
      
      const processedRow: any = {
        latitude: lat,
        longitude: lng
      };
      
      for (const header of this.csvHeaders) {
        if (header !== this.csvMapping.latitude && header !== this.csvMapping.longitude) {
          processedRow[header] = row[header];
        }
      }
      
      return processedRow;
    }).filter(row => row !== null);
  }

  updateAvailablePopupFields(fields: string[]): void {
    const newFields = fields.filter(field => 
      field !== 'latitude' && 
      field !== 'longitude' && 
      !this.availablePopupFields.includes(field)
    );
    
    if (newFields.length > 0) {
      this.availablePopupFields = [...this.availablePopupFields, ...newFields];
      console.log('updateAvailablePopupFields: Added new fields:', newFields);
    }
  }

  resetCsvImport(): void {
    this.csvFile = null;
    this.csvHeaders = [];
    this.csvPreviewData = [];
    this.csvMapping = { latitude: '', longitude: '' };
    this.csvImportError = '';
    this.csvImportStep = 1;
  }
}