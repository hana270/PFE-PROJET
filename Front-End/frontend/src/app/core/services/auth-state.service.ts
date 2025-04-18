import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { isPlatformBrowser } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();

  constructor(
    private jwtHelper: JwtHelperService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwt');
      if (token) {
        this.updateAuthState(true, token);
      }
    }
  }
  
  // Add getter for current token value
  get currentToken(): string | null {
    return this.tokenSubject.value;
  }

  // Add getter for current login status
  get isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  updateAuthState(isLoggedIn: boolean, token?: string): void {
    this.isLoggedInSubject.next(isLoggedIn);
    if (token) {
      this.tokenSubject.next(token);
    } else if (!isLoggedIn) {
      this.tokenSubject.next(null);
    }
  }

  get currentUserId(): number | null {
    const token = this.tokenSubject.value;
    if (token) {
      try {
        const decoded = this.jwtHelper.decodeToken(token);
        return decoded?.userId || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  get currentUserEmail(): string | null {
    const token = this.tokenSubject.value;
    if (token) {
      try {
        const decoded = this.jwtHelper.decodeToken(token);
        return decoded?.email || null;
      } catch {
        return null;
      }
    }
    return null;
  }
  getAuthHeaders(): HttpHeaders {
    const headers = new HttpHeaders();
    const token = this.currentToken;
    
    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }
  logout() {
    this.isLoggedInSubject.next(false);
    this.tokenSubject.next(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('jwt');
    }
  }
}