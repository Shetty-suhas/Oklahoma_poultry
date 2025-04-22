import { Routes } from '@angular/router';
import { PoultryMapComponent } from './poultry-map/poultry-map.component';
import { MapConfigurationComponent } from './map-configuration/map-configuration.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: PoultryMapComponent },
  { path: 'login', component: LoginComponent },
  { 
    path: 'config', 
    component: MapConfigurationComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];
