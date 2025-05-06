// auth-state.service.ts
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { isPlatformBrowser } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(
    private jwtHelper: JwtHelperService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  get currentToken(): string | null {
    return this.tokenSubject.value;
  }

  get token(): string | null {
    return this.currentToken;
  }

  get isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  updateAuthState(isLoggedIn: boolean, token?: string, user?: User): void {
    this.isLoggedInSubject.next(isLoggedIn);
    
    if (token) {
      this.tokenSubject.next(token);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('jwt', token);
      }
    }

    if (user) {
      this.currentUserSubject.next(user);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
    }

    if (!isLoggedIn) {
      this.clearAuthState();
    }
  }

  clearAuthState(): void {
    this.isLoggedInSubject.next(false);
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('jwt');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
  }
  get currentUserId(): number | null {
    const token = this.tokenSubject.value;
    if (!token) return null;
    
    try {
        const decoded = this.jwtHelper.decodeToken(token);
        // Assurez-vous que votre token JWT contient bien un champ userId numérique
        return decoded?.userId ? Number(decoded.userId) : null;
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
  }
  getToken(): string | null {
    return this.currentToken;
  }
  getAuthHeaders(): HttpHeaders {
    const headers = new HttpHeaders();
    const token = this.currentToken;
    
    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }
}