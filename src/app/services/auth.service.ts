import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Auth, signInWithEmailAndPassword, signOut, authState, User } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  redirectUrl: string | null = null;

  constructor() {
    // Subscribe to authentication state changes
    authState(this.auth).subscribe(user => {
      this.userSubject.next(user);
    });
  }

  loginWithEmail(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth)
      .then(() => {
        this.router.navigate(['/login']);
      });
  }

  isLoggedIn(): Observable<boolean> {
    return of(this.userSubject.value !== null);
  }
  
  // For compatibility with your auth guard
  isAuthenticated(): boolean {
    return this.userSubject.value !== null;
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }
}