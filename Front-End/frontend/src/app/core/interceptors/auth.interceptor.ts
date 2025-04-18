// auth.interceptor.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { AuthStateService } from '../services/auth-state.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authState: AuthStateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let headers = req.headers;
    
    // Use the currentToken getter instead of subscribing
    if (this.authState.currentToken) {
      headers = headers.set('Authorization', `Bearer ${this.authState.currentToken}`);
    }

    if (isPlatformBrowser(this.platformId)) {
      const sessionId = localStorage.getItem('session_id');
      if (sessionId && !this.authState.isLoggedIn) {
        headers = headers.set('X-Session-ID', sessionId);
      }
    }

    const authReq = req.clone({ headers });
    return next.handle(authReq);
  }
}