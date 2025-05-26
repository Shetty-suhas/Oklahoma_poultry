import { Component, OnInit, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationStart } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MapConfigService, MapConfig } from '../services/map-config.service';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

interface CsvMapping {
  latitude: string;
  longitude: string;
  [key: string]: string;
}

interface PreviewData {
  mapConfig: MapConfig;
  fieldConfig?: FieldConfig;
  markerDesign?: MarkerDesign;
}

interface FieldConfig {
  collectionName: string;
  configurationName: string;
  selectedColumns: string[];
  renames: { original: string; renamed: string }[];
}

interface MarkerDesign {
  name: string;
  svg: string;
}

@Component({
  selector: 'app-map-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-configuration.component.html',
  styleUrls: ['./map-configuration.component.css']
})
export class MapConfigurationComponent implements OnInit, OnDestroy {
  config: MapConfig = {
    name: '',
    mapStyleName: 'streets',
    center: [-96.921387, 36.084621],
    zoom: 8,
    clusterRadius: 50,
    clusterMaxZoom: 14,
    configurationName: '',
    markerDesignName: ''
  };
  activePopupTab: 'upload' | 'fields-config' | 'marker-design' = 'upload';
  fieldDisplayNames: { [key: string]: string } = {};
  csvFile: File | null = null;
  csvHeaders: string[] = [];
  csvPreviewData: any[] = [];
  csvMapping: CsvMapping = { latitude: '', longitude: '' };
  csvImportStep = 1;
  csvImportError = '';
  isProcessingCsv = false;
  uploadStatus: string | null = null;
  selectedFileName: string | null = null;
  collectionName: string = '';
  uploadedCollectionName: string | null = null;
  availableCollections: string[] = [];
  selectedCollection: string = '';
  selectedFieldsCollection: string = '';
  configurationName: string = ''; 
  configurationNameError: string = ''; 
  routerSubscription: Subscription | null = null;
  currentPage: number = 1;
  pageSize: number = 30;
  totalRecords: number = 0;
  totalPages: number = 0;
  isNewUpload: boolean = false;
  availablePopupFields: string[] = [];
  availableConfigurations: string[] = [];
  selectedConfiguration: string = '';
  selectedMapConfiguration: string = '';
  markerDesign: string = '';
  markerDesignError: string = '';
  markerDesignName: string = '';
  markerDesignNameError: string = '';
  selectedMarker: string = ''
  availableMarkers: string[] = []
  availableMapConfigurations: string[] = [];
  showConfigNameModal: boolean = false;
  isLoading: boolean = false;
  currentAppliedConfig: string = '';
  showPreviewModal: boolean = false;
  isLoadingPreview: boolean = false;
  previewData: PreviewData | null = null;
  Math = Math;

  availableMapStyles: { id: string; name: string; imagePath: string }[] = [
    { id: 'streets', name: 'Streets', imagePath: 'assets/streets.png' },
    { id: 'outdoors', name: 'Outdoors', imagePath: 'assets/outdoors.png' },
    { id: 'light', name: 'Light', imagePath: 'assets/light.png' },
    { id: 'dark', name: 'Dark', imagePath: 'assets/dark.png' },
    { id: 'satellite', name: 'Satellite', imagePath: 'assets/satellite.png' },
    { id: 'satelliteStreets', name: 'Satellite Streets', imagePath: 'assets/satellitestreets.png' },
    { id: 'navigationDay', name: 'Navigation Day', imagePath: 'assets/navigationday.png' },
    { id: 'navigationNight', name: 'Navigation Night', imagePath: 'assets/navigationnight.png' }
  ];
  selectedPopupFields: any;
  renames: any;

  constructor(
    private router: Router,
    private mapConfigService: MapConfigService,
    private http: HttpClient,
    private toastr: ToastrService
  ) {
    // this.config = { ...this.mapConfigService.getCurrentConfig() };
    // this.loadFieldDisplayNames();
  }

  ngOnInit(): void {
    this.fetchMapConfigurations();
    this.fetchConfigurations();
    this.fetchMarkers();
    this.fetchCollections();
    console.log('Component initialized, csvImportStep:', this.csvImportStep, 'csvPreviewData:', this.csvPreviewData.length);

    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart && this.uploadedCollectionName) {
        this.discardTemporaryCollection();
      }
    });

    this.http.get<MapConfig>('https://my-flask-app-1033096764168.asia-south1.run.app//get-selected-map-config').subscribe({
      next: (config) => {
        this.selectedMapConfiguration = config.name;
        this.currentAppliedConfig = config.name;
        this.toastr.success('Selected map configuration loaded: ' + config.name);
        this.isLoading = false;
      },
      error: (err) => {
        this.toastr.error('Failed to load selected map configuration');
        this.selectedMapConfiguration = '';
        this.currentAppliedConfig = '';
        this.isLoading = false;
      }
    });
  
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart && this.uploadedCollectionName) {
        this.discardTemporaryCollection();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.uploadedCollectionName) {
      this.discardTemporaryCollection();
    }
  }

  fetchMarkers(): void { 
    this.http.get<string[]>('https://my-flask-app-1033096764168.asia-south1.run.app//marker-designs').subscribe({
      next: (markers) => this.availableMarkers = markers,
      error: (err) => console.error('Failed to load markers', err)
    });
  }

  fetchMapConfigurations(): void {
    this.http.get<string[]>('https://my-flask-app-1033096764168.asia-south1.run.app//map-configs').subscribe({
      next: (configs) => {
        this.availableMapConfigurations = configs;
      },
      error: (err) => {
        console.error('Failed to fetch configurations:', err);
        this.uploadStatus = 'Failed to fetch configurations';
      }
    });
  }

  onConfigurationChange(): void {
    if (this.selectedConfiguration) {
      // this.mapConfigService.setSelectedConfiguration(this.selectedConfiguration);
      this.mapConfigService.getConfiguration(this.selectedConfiguration).subscribe(config => {
        if (config) {
          this.selectedPopupFields = config.selectedColumns;
          this.renames = config.renames;
        } else {
          this.selectedPopupFields = [];
          this.renames = [];
        }
      });
    } else {
      // this.mapConfigService.setSelectedConfiguration('');
      this.selectedPopupFields = [];
      this.renames = [];
    }
  }

  fetchConfigurations(): void {
    this.http.get<string[]>('https://my-flask-app-1033096764168.asia-south1.run.app//configurations').subscribe({
      next: (configs) => {
        this.availableConfigurations = configs;
      },
      error: (err) => {
        console.error('Failed to fetch configurations:', err);
        this.uploadStatus = 'Failed to fetch configurations';
      }
    });
  }

  saveMarkerDesign(): void {
    if (!this.markerDesignName.trim()) {
      this.markerDesignNameError = 'Marker design name is required';
      this.toastr.error(this.markerDesignNameError);
      return;
    }
    if (!this.markerDesign.trim()) {
      this.markerDesignError = 'SVG code is required';
      this.toastr.error(this.markerDesignNameError);
      return;
    }
    if (!this.markerDesign.trim().toLowerCase().startsWith('<svg')) {
      this.markerDesignError = 'SVG code must start with <svg>';
      this.toastr.error(this.markerDesignNameError);
      return;
    }
    const payload = {
      markerDesign: {
        name: this.markerDesignName.trim(),
        svg: this.markerDesign.trim()
      }
    };
    this.http.post('https://my-flask-app-1033096764168.asia-south1.run.app//save-marker-design', payload).subscribe({
      next: (response: any) => {
        this.uploadStatus = response.message; 
        this.toastr.success(this.uploadStatus || "Marker design saved successfully");
        this.cancelMarkerDesign();
      },
      error: (err) => {
        this.markerDesignError = err.error?.error || 'Failed to save marker design';
        this.toastr.error(this.markerDesignError);
      }
    });
  }


  cancelMarkerDesign(): void {
    this.markerDesign = '';
    this.markerDesignName = '';
    this.markerDesignError = '';
    this.markerDesignNameError = '';
  }

  getDisplayName(field: string): string {
    return this.fieldDisplayNames[field] || field;
  }

  getImagePath(styleId: string): string {
    const style = this.availableMapStyles.find(s => s.id === styleId);
    return style ? style.imagePath : '';
  }

  updateCenter(): void {
    const lon = parseFloat(this.config.center[0].toString());
    const lat = parseFloat(this.config.center[1].toString());
    if (isNaN(lon) || isNaN(lat)) {
      this.config.center = [-94.8945, 36.204182];
    } else {
      this.config.center[0] = Math.max(-180, Math.min(180, lon));
      this.config.center[1] = Math.max(-90, Math.min(90, lat));
    }
  }

  getRename(field: string): string {
    const rename = this.renames.find((r: { original: string; }) => r.original === field);
    return rename ? rename.renamed : field;
  }

  updateRename(field: string, renamed: string): void {
    const rename = this.renames.find((r: { original: string; }) => r.original === field);
    if (rename) {
      rename.renamed = renamed.trim() || field; 
    }
  }

  isInvalidCoordinate(type: 'longitude' | 'latitude'): boolean {
    const value = parseFloat(this.config.center[type === 'longitude' ? 0 : 1].toString());
    if (isNaN(value)) return true;
    if (type === 'longitude') return value < -180 || value > 180;
    return value < -90 || value > 90;
  }

  togglePopupField(field: string): void {
    const index = this.selectedPopupFields.indexOf(field);
    if (index === -1) {
      this.selectedPopupFields.push(field);
      const rename = this.renames.find((r: { original: string; }) => r.original === field);
      if (!rename) {
        this.renames.push({ original: field, renamed: field });
      }
    } else {
      this.selectedPopupFields.splice(index, 1);
      this.renames = this.renames.filter((r: { original: string; }) => r.original !== field);
    }
  }

  isFieldSelected(field: string): boolean {
    return this.selectedPopupFields.includes(field);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      if (this.uploadedCollectionName || this.selectedCollection) {
        this.fetchUploadedData(this.uploadedCollectionName || this.selectedCollection);
      }
    }
  }

  fetchCollectionColumns(collectionName: string): void {
    this.http.get<{ columns: string[] }>(`https://my-flask-app-1033096764168.asia-south1.run.app//columns/${collectionName}`).subscribe({
      next: (response) => {
        this.availablePopupFields = response.columns;
        this.selectedPopupFields = [];
        this.renames = [];
        this.uploadStatus = 'Columns loaded successfully';
      },
      error: (err) => {
        console.error('Failed to fetch columns:', err);
        this.uploadStatus = 'Failed to fetch collection columns';
        this.availablePopupFields = [];
      }
    });
  }

  selectCollection(collection: string, tab: 'upload' | 'fields-config'): void {
    if (tab === 'upload') {
      this.selectedCollection = collection;
      if (collection) {
        this.currentPage = 1;
        this.csvImportStep = 3;
        this.isNewUpload = false;
        this.uploadedCollectionName = null;
        this.csvFile = null;
        this.selectedFileName = null;
        this.collectionName = '';
        this.fetchUploadedData(collection);
      }
    } else if (tab === 'fields-config') {
      this.selectedFieldsCollection = collection;
      this.configurationName = '';
      this.configurationNameError = '';
      if (collection) {
        this.fetchCollectionColumns(collection);
      } else {
        this.availablePopupFields = [];
        this.selectedPopupFields = [];
        this.renames = [];
      }
    }
  }

  confirmFieldsConfig(): void {
    if (!this.selectedFieldsCollection) {
      this.uploadStatus = 'Error: No collection selected';
      this.toastr.error(this.uploadStatus);
      return;
    }
    if (!this.configurationName.trim()) {
      this.configurationNameError = 'Configuration name is required';
      this.uploadStatus = 'Error: Configuration name is required';
      this.toastr.error(this.uploadStatus);
      return;
    }
    if (this.selectedPopupFields.length === 0) {
      this.uploadStatus = 'Error: At least one field must be selected';
      this.toastr.error(this.uploadStatus);
      return;
    }

    const configData = {
      collectionName: this.selectedFieldsCollection,
      configurationName: this.configurationName.trim(),
      selectedColumns: [...this.selectedPopupFields],
      renames: [...this.renames]
    };

    this.http.post('https://my-flask-app-1033096764168.asia-south1.run.app//save-config', configData).subscribe({
      next: (response: any) => {
        this.uploadStatus = response.message || 'Configuration saved successfully';
        this.fetchConfigurations();
        this.cancelFieldsConfig();
        this.toastr.success(this.uploadStatus || "Configuration saved successfully");
      },
      error: (err) => {
        this.uploadStatus = `Error saving configuration: ${err.error?.error || 'Request failed'}`;
        this.toastr.error(this.uploadStatus);
      }
    });
  }

  cancelFieldsConfig(): void {
    this.selectedFieldsCollection = '';
    this.availablePopupFields = [];
    this.selectedPopupFields = [];
    this.renames = [];
    this.configurationName = '';
    this.configurationNameError = '';
    this.uploadStatus = null;
    console.log('Fields configuration cancelled');
  }

  getPaginationRange(): number[] {
    const range: number[] = [];
    const delta = 2;
    
    let start = Math.max(2, this.currentPage - delta);
    let end = Math.min(this.totalPages - 1, this.currentPage + delta);
    
    if (this.currentPage - delta < 2) {
      end = Math.min(this.totalPages - 1, end + (2 - (this.currentPage - delta)));
    }
    
    if (this.currentPage + delta > this.totalPages - 1) {
      start = Math.max(2, start - ((this.currentPage + delta) - (this.totalPages - 1)));
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    
    return range;
  }

  updatePageSize(): void {
    this.currentPage = 1;
    if (this.uploadedCollectionName || this.selectedCollection) {
      this.fetchUploadedData(this.uploadedCollectionName || this.selectedCollection);
    }
  }

  get emptyRowsArray(): number[] {
    const emptyRows = this.pageSize - this.csvPreviewData.length;
    return emptyRows > 0 ? Array(emptyRows).fill(0) : [];
  }

  saveConfiguration(): void {
    this.configurationName = '';
    this.configurationNameError = '';
    this.showConfigNameModal = true;
  }

  confirmSaveConfiguration(): void {
    if (!this.configurationName.trim()) {
      this.configurationNameError = 'Configuration name is required';
      this.uploadStatus = 'Configuration name is required';
      this.toastr.error(this.uploadStatus);
      return;
    }
    this.showConfigNameModal = false;
    const configData = {
      name: this.configurationName.trim(),
      mapStyleName: this.config.mapStyleName,
      center: this.config.center,
      zoom: this.config.zoom,
      clusterRadius: this.config.clusterRadius,
      clusterMaxZoom: this.config.clusterMaxZoom,
      configurationName: this.selectedConfiguration || '',
      markerDesignName: this.selectedMarker || ''
    };
    this.http.post('https://my-flask-app-1033096764168.asia-south1.run.app//save-map-config', configData).subscribe({
      next: (response: any) => {
        this.uploadStatus = response.message || 'Configuration saved successfully';
        this.toastr.success(this.uploadStatus || "Configuration saved successfully");
      },
      error: (err) => {
        this.uploadStatus = `Error saving configuration: ${err.error?.error || 'Request failed'}`;
        console.error('Save configuration error:', err);
        this.toastr.error(this.uploadStatus);
      }
    });
  }

  cancelSaveConfiguration(): void {
    this.showConfigNameModal = false;
    this.configurationName = '';
    this.configurationNameError = '';
    this.uploadStatus = null;
  } 

  resetToDefaults(): void {
    this.config = {
      name: '',
      mapStyleName: 'streets',
      center: [-96.921387, 36.084621],
      zoom: 8,
      clusterRadius: 50,
      clusterMaxZoom: 14,
      configurationName: '',
      markerDesignName: ''
    };
    this.selectedConfiguration = '';
    this.selectedMarker = '';
    this.selectedPopupFields = [];
    this.renames = [];
    // this.mapConfigService.saveConfig(this.config).subscribe(() => {
      // this.mapConfigService.setSelectedConfiguration('');
      // alert('Configuration reset and updated in memory.');
    // });
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.csvFile = null;
      this.selectedFileName = null;
      this.uploadStatus = null;
      this.collectionName = '';
      this.csvPreviewData = [];
      this.csvHeaders = [];
      this.csvImportStep = 1;
      this.isNewUpload = false;
      console.log('No file selected, reset to step 1, csvImportStep:', this.csvImportStep);
      return;
    }

    this.csvFile = input.files[0];
    this.selectedFileName = this.csvFile.name;
    this.csvImportError = '';
    this.csvHeaders = [];
    this.csvPreviewData = [];
    this.csvMapping = { latitude: '', longitude: '' };
    this.csvImportStep = 2;
    this.uploadStatus = null;
    this.isNewUpload = true;
    console.log('File selected, moved to step 2, csvImportStep:', this.csvImportStep, 'file:', this.selectedFileName);
  }

  uploadFile(): void {
    if (!this.csvFile || !this.collectionName.trim()) {
      this.uploadStatus = 'Error: File and collection name are required';
      this.csvImportError = this.uploadStatus;
      this.toastr.error(this.uploadStatus);
      return;
    }

    this.isProcessingCsv = true;
    this.uploadStatus = 'Uploading file...';
    this.toastr.info('Uploading file...');
    const formData = new FormData();
    formData.append('file', this.csvFile, this.csvFile.name);
    formData.append('collectionName', this.collectionName);

    this.http.post('https://my-flask-app-1033096764168.asia-south1.run.app//upload', formData).subscribe({
      next: (response: any) => {
        this.uploadStatus = response.message || 'File uploaded successfully';
        this.isProcessingCsv = false;
        this.csvImportStep = 3;
        this.uploadedCollectionName = response.collectionName;
        this.isNewUpload = true;
        this.toastr.success(this.uploadStatus || "File uploaded successfully");
        this.fetchUploadedData(response.collectionName);
      },
      error: (error) => {
        this.uploadStatus = `Error: ${error.error?.error || 'Upload failed'}`;
        this.csvImportError = this.uploadStatus;
        this.isProcessingCsv = false;
        this.csvImportStep = 2;
        this.toastr.error(this.uploadStatus);
      }
    });
  }

  fetchUploadedData(collectionName: string): void {
    console.log('Fetching data for collection:', collectionName, 'page:', this.currentPage, 'per_page:', this.pageSize);
    this.http.get<any>(`https://my-flask-app-1033096764168.asia-south1.run.app//poultry-data/${collectionName}?page=${this.currentPage}&per_page=${this.pageSize}`).subscribe({
      next: (response: any) => {
        console.log('Raw response:', response);
        console.log('Raw first document:', response.data[0]);
        if (response.data && response.data.length > 0) {
          this.csvHeaders = Object.keys(response.data[0]);
          console.log('csvHeaders (original order):', this.csvHeaders);
          this.csvPreviewData = response.data;
          this.totalRecords = response.total || response.data.length;
          this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
          this.uploadStatus = 'Data loaded successfully';
        } else {
          this.uploadStatus = 'No data found in collection. Please confirm or cancel.';
          this.csvHeaders = [];
          this.csvPreviewData = [];
          this.totalRecords = 0;
          this.totalPages = 0;
        }
        console.log('Data set, csvImportStep:', this.csvImportStep, 'csvPreviewData:', this.csvPreviewData.length, 'headers:', this.csvHeaders, 'uploadStatus:', this.uploadStatus);
      },
      error: (error) => {
        this.uploadStatus = `Error fetching data: ${error.error?.error || 'Request failed'}`;
        this.csvImportError = this.uploadStatus;
        this.csvHeaders = [];
        this.csvPreviewData = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        console.error('Fetch error, staying at step 3, csvImportStep:', this.csvImportStep, 'error:', error);
      }
    });
  }

  confirmUpload(): void {
    if (!this.uploadedCollectionName) {
      this.uploadStatus = 'Error: No collection to confirm';
      this.csvImportError = this.uploadStatus;
      this.toastr.error(this.uploadStatus);
      return;
    }

    console.log('Confirming upload, collection:', this.uploadedCollectionName);
    this.http.post(`https://my-flask-app-1033096764168.asia-south1.run.app//confirm/${this.uploadedCollectionName}`, {}).subscribe({
      next: (response: any) => {
        this.uploadStatus = response.message || 'Collection confirmed';
        this.uploadedCollectionName = null;
        this.isNewUpload = false;
        this.csvImportStep = 1;
        this.csvPreviewData = [];
        this.csvHeaders = [];
        this.fetchCollections();
        this.toastr.success(this.uploadStatus || "Collection confirmed'");
      },
      error: (error) => {
        this.uploadStatus = `Error confirming collection: ${error.error?.error || 'Request failed'}`;
        this.csvImportError = this.uploadStatus;
        this.toastr.error(this.uploadStatus);
      }
    });
  }

  cancelUpload(): void {
    console.log('Cancelling upload, current csvImportStep:', this.csvImportStep);
    this.resetCsvImport();
    console.log('Upload cancelled, reset to step 1, csvImportStep:', this.csvImportStep);
  }

  discardTemporaryCollection(): void {
    if (this.uploadedCollectionName) {
      console.log('Discarding temporary collection:', this.uploadedCollectionName);
      this.http.delete(`https://my-flask-app-1033096764168.asia-south1.run.app//discard/${this.uploadedCollectionName}`).subscribe({
        next: () => {
          this.uploadedCollectionName = null;
          this.csvPreviewData = [];
          this.csvHeaders = [];
          this.uploadStatus = 'Temporary data discarded';
          console.log('Temporary collection discarded, csvImportStep:', this.csvImportStep);
        },
        error: (error) => {
          console.error('Error discarding collection:', error);
        }
      });
    }
  }

  fetchCollections(): void {
    this.http.get<string[]>('https://my-flask-app-1033096764168.asia-south1.run.app//collections').subscribe({
      next: (collections) => {
        this.availableCollections = collections;
        console.log('Collections fetched:', this.availableCollections);
      },
      error: (error) => {
        console.error('Error fetching collections:', error);
        this.uploadStatus = 'Failed to fetch collections';
      }
    });
  }

  resetCsvImport(): void {
    if (this.uploadedCollectionName) {
      this.discardTemporaryCollection();
    }
    this.csvFile = null;
    this.selectedFileName = null;
    this.collectionName = '';
    this.csvHeaders = [];
    this.csvPreviewData = [];
    this.csvMapping = { latitude: '', longitude: '' };
    this.csvImportError = '';
    this.csvImportStep = 1;
    this.uploadStatus = null;
    this.isProcessingCsv = false;
    this.uploadedCollectionName = null;
    this.selectedCollection = '';
    this.totalRecords = 0;
    this.totalPages = 0;
    this.currentPage = 1;
    this.isNewUpload = false;
  }

  previewMapConfig(configName: string): void {
    this.isLoadingPreview = true;
    this.showPreviewModal = true;
    this.previewData = null;

    // Fetch map configuration
    this.http.get<MapConfig>(`https://my-flask-app-1033096764168.asia-south1.run.app//map-config/${configName}`).subscribe({
      next: (mapConfig) => {
        this.previewData = { mapConfig };
        this.config = { ...mapConfig };
        this.selectedConfiguration = mapConfig.configurationName;
        this.selectedMarker = mapConfig.markerDesignName;

        // Fetch field configuration if configurationName exists
        if (mapConfig.configurationName) {
          this.http.get<FieldConfig>(`https://my-flask-app-1033096764168.asia-south1.run.app//configurations/${mapConfig.configurationName}`).subscribe({
            next: (fieldConfig) => {
              this.previewData!.fieldConfig = fieldConfig;
              this.selectedPopupFields = fieldConfig.selectedColumns;
              this.renames = fieldConfig.renames;
              this.isLoadingPreview = false;
            },
            error: (err) => {
              console.error('Failed to load field configuration:', err);
              this.isLoadingPreview = false;
            }
          });
        }

        // Fetch marker design if markerDesignName exists
        if (mapConfig.markerDesignName) {
          this.http.get<{ markerDesign: MarkerDesign }>(`https://my-flask-app-1033096764168.asia-south1.run.app//marker-design/${mapConfig.markerDesignName}`).subscribe({
            next: (response) => {
              this.previewData!.markerDesign = response.markerDesign;
              this.isLoadingPreview = false;
            },
            error: (err) => {
              console.error('Failed to load marker design:', err);
              this.isLoadingPreview = false;
            }
          });
        }

        if (!mapConfig.configurationName && !mapConfig.markerDesignName) {
          this.isLoadingPreview = false;
        }
      },
      error: (err) => {
        console.error('Failed to load map configuration:', err);
        this.uploadStatus = 'Failed to preview configuration';
        this.isLoadingPreview = false;
        this.closePreviewModal();
      }
    });
  }

  closePreviewModal(event?: Event): void {
    if (event && event.target !== event.currentTarget) return;
    this.showPreviewModal = false;
    this.previewData = null;
    this.isLoadingPreview = false;
  }

  selectConfig(config: string): void {
    this.selectedMapConfiguration = config;
  }

  applyMapConfiguration(config: string): void {
    this.isLoading = true;
    this.http.post('https://my-flask-app-1033096764168.asia-south1.run.app//set-selected-map-config', { name: config }).subscribe({
      next: (response: any) => {
        this.currentAppliedConfig = config;
        this.uploadStatus = response.message || 'Map configuration applied';
        this.toastr.success(this.uploadStatus || "Map configuration applied successfully");
      },
      error: (err) => {
        this.uploadStatus = `Error applying configuration: ${err.error?.error || 'Request failed'}`;
        this.toastr.error(this.uploadStatus);
        this.isLoading = false;
      }
    });
  }
}