import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { CartService } from './cart.service';
import { AuthStateService } from './auth-state.service';
import { Panier } from '../models/panier.model';

@Injectable({ providedIn: 'root' })
export class CartMigrationService {
  constructor(
    private cartService: CartService,
    private http: HttpClient,
    private authState: AuthStateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  migrateSessionCartToUser(): Observable<Panier> {
    if (!isPlatformBrowser(this.platformId)) {
      return this.cartService.getServerCart();
    }

    const sessionId = localStorage.getItem('session_id');
    const isLoggedIn = this.authState.isLoggedIn;

    if (!sessionId || isLoggedIn) {
      return this.cartService.getServerCart();
    }

    return this.http.post<Panier>(
      `${this.cartService.apiUrl}/migrate`,
      null,
      {
        headers: new HttpHeaders().set('X-Session-ID', sessionId),
      }
    ).pipe(
      tap(() => localStorage.removeItem('session_id')),
      catchError((error) => {
        console.error('Migration error:', error);
        return this.cartService.getServerCart();
      })
    );
  }
}
