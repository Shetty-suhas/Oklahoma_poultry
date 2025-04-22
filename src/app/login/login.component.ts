import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Check if user is already logged in
    this.authService.user$.subscribe(user => {
      if (user) {
        const redirectUrl = this.authService.redirectUrl || '/config';
        this.router.navigateByUrl(redirectUrl);
      }
    });
  }

  login(): void {
    this.errorMessage = '';
    
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }
    
    this.isLoading = true;
    
    this.authService.loginWithEmail(this.username, this.password)
      .then(() => {
        this.isLoading = false;
        const redirectUrl = this.authService.redirectUrl || '/config';
        this.router.navigateByUrl(redirectUrl);
      })
      .catch(error => {
        this.isLoading = false;
        
        // Handle different Firebase auth errors
        switch(error.code) {
          case 'auth/invalid-email':
            this.errorMessage = 'Invalid email address format';
            break;
          case 'auth/user-disabled':
            this.errorMessage = 'This account has been disabled';
            break;
          case 'auth/user-not-found':
            this.errorMessage = 'User not found';
            break;
          case 'auth/wrong-password':
            this.errorMessage = 'Incorrect password';
            break;
          default:
            this.errorMessage = 'Authentication failed: ' + error.message;
        }
      });
  }
}