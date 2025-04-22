import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Changed from isAuthenticated() to isLoggedIn()
  return authService.isLoggedIn().pipe(
    map((isLoggedIn: any) => {
      if (isLoggedIn) {
        return true;
      }
      
      authService.redirectUrl = state.url;
      return router.parseUrl('/login');
    })
  );
};
