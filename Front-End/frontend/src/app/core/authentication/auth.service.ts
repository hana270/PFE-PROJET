import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import Swal from 'sweetalert2';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { User } from '../models/user.model';
import { Observable, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { SocialUser } from '@abacritt/angularx-social-login';
import { BehaviorSubject, of } from 'rxjs';
import { CartService } from '../services/cart.service';

import { Injector } from '@angular/core';
import { CartMigrationService } from '../services/cart-migration.service';
import { SessionService } from '../services/session.service';
import { AuthStateService } from '../services/auth-state.service';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  apiURL: string = 'http://localhost:8002/users';
  oauthURL = 'http://localhost:8080/oauth2';

  token!: string;

  private tokenKey = 'jwt_token';
  private userKey = 'current_user';
  
  public loggedUser!: string;
  public isloggedIn: Boolean = false;
  public roles!: string[];
  public regitredUser: User = new User();
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);


  private loggedUserSubject = new BehaviorSubject<string>(this.loggedUser);
public loggedUser$ = this.loggedUserSubject.asObservable();

  // Initialize the BehaviorSubject properly with a default value
  private loggedInStatus: BehaviorSubject<boolean>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private http: HttpClient,
    private jwtHelper: JwtHelperService,
    private cartService: CartService ,
    private injector: Injector ,
    private authState: AuthStateService
 ) {
    // Initialize with proper check if we're in browser
    this.loggedInStatus = new BehaviorSubject<boolean>(this.hasValidToken());
    this.loadToken();
    this.checkTokenValidity();
  }

  // Éviter d'injecter CartService directement dans le constructeur
// Utiliser plutôt une méthode séparée pour la migration du panier
public performCartMigration(): Observable<any> {
  const cartService = this.injector.get(CartService);
  return cartService.migrateSessionCartToUser();
}

  
  // Method to check if a token exists and is valid
  private hasValidToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwt');
      return !!token && !this.jwtHelper.isTokenExpired(token);
    }
    return false;
  }

  // Check token validity and update logged in status
  private checkTokenValidity(): void {
    const isLoggedIn = this.hasValidToken();
    this.setLoggedInStatus(isLoggedIn);
  }
/*
  // Getter for isLoggedIn status that always checks platform first
  public get isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwt');
      if (!token) {
        console.log('isLoggedIn: false (pas de token)');
        return false;
      }
      
      try {
        const isExpired = this.jwtHelper.isTokenExpired(token);
        console.log('isLoggedIn:', !isExpired, '(token expiré:', isExpired, ')');
        return !isExpired;
      } catch (err) {
        console.error('Erreur lors de la vérification du token:', err);
        return false;
      }
    }
    return false;
  }
*/

get isLoggedIn(): boolean {
  return this.authState.isLoggedIn;
}

get isLoggedIn$() {
  return this.authState.isLoggedIn$;
}

  loadToken() {
    if (isPlatformBrowser(this.platformId)) {
      this.token = localStorage.getItem('jwt') || '';
      if (this.token) {
        // Vérifier si le token commence par "Bearer "
        if (this.token.startsWith('Bearer ')) {
          this.token = this.token.substring(7);
        }
        
        console.log('Token chargé:', this.token); // Log pour déboguer
        this.decodeJWT();
        this.isloggedIn = true;
        this.setLoggedInStatus(true);
      } else {
        console.log('Aucun token trouvé dans le localStorage');
        this.isloggedIn = false;
        this.setLoggedInStatus(false);
      }
    }
  }

  getToken(): string {
    // Vérifier que le token n'est pas null ou undefined
    if (!this.token && isPlatformBrowser(this.platformId)) {
      console.log('Token non disponible, tentative de recharger depuis localStorage');
      this.loadToken();
    }
    
    console.log('Token fourni:', this.token); // Log pour déboguer
    return this.token || '';
  }

  saveToken(jwt: string) {
    if (isPlatformBrowser(this.platformId)) {
      if (jwt?.startsWith('Bearer ')) {
        jwt = jwt.substring(7);
      }
      localStorage.setItem('jwt', jwt);
      
      this.authState.updateAuthState(true, jwt);
      
      this.token = jwt;
      this.decodeJWT();
    }
  }

  private decodeJWT() {
    if (this.token) {
      try {
        const decodedToken = this.jwtHelper.decodeToken(this.token);
        console.log('Decoded Token:', decodedToken);
        console.log('Email from token:', decodedToken.email); // Ajout de l'affichage de l'email
        
        this.roles = decodedToken.roles || [];
        this.loggedUser = decodedToken.sub;
        this.loggedUserSubject.next(this.loggedUser); // Émettre le nouveau nom d'utilisateur
        this.isloggedIn = true;
        this.setLoggedInStatus(true);
        
        // Afficher plus de détails pour le débogage
        console.log('User roles:', this.roles);
        console.log('Username (sub):', this.loggedUser);
        console.log('Token expiration:', decodedToken.exp ? new Date(decodedToken.exp * 1000) : 'N/A');
      } catch (error) {
        console.error('Error decoding JWT:', error);
        this.logout();
      }
    }
  }

  deJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decodedToken = JSON.parse(atob(base64));
      return decodedToken;
    } catch (error) {
      console.error('Error manually decoding JWT:', error);
      return {};
    }
  }

  getUserRoles(): string[] {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwt');
      if (token) {
        const decodedToken = this.deJWT(token);
        return decodedToken.roles || [];
      }
    }
    return [];
  }

  isTokenExpired(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwt');
      if (!token) return true;
      return this.jwtHelper.isTokenExpired(token);
    }
    return true;
  }

  getUserRole(): string | undefined {
    return this.roles?.[0];
  }

  socialLogin(socialUser: SocialUser): Observable<any> {
    const payload = {
      email: socialUser.email,
      name: socialUser.name,
      idToken: socialUser.idToken,
      provider: socialUser.provider,
    };
  
    return this.http
      .post<any>(`${this.oauthURL}/social-login`, payload, {
        observe: 'response',
      })
      .pipe(
        tap((response) => {
          const jwt = response.headers.get('Authorization');
          if (jwt) {
            this.saveToken(jwt);
            this.setLoggedInStatus(true);
            // Migrer le panier après la connexion sociale réussie
            this.cartService.migrateSessionCartToUser().subscribe({
              next: () => {
                console.log('Panier migré avec succès après connexion sociale');
                this.redirectBasedOnRole();
              },
              error: (err) => {
                console.error('Erreur lors de la migration du panier:', err);
                this.redirectBasedOnRole();
              }
            });
          }
        }),
        catchError((error) => {
          console.error('Social login error:', error);
          Swal.fire('Erreur', error.error?.message || 'Échec de la connexion sociale', 'error');
          return of(null);
        })
      );
  }

  verifyEmail(email: string, code: string): Observable<any> {
    return this.http
      .post(
        `${this.apiURL}/verify-email`,
        { email, code },
        { observe: 'response' }
      )
      .pipe(
        tap((response) => {
          const jwt = response.headers.get('Authorization');
          if (jwt) {
            this.saveToken(jwt);
            this.setLoggedInStatus(true);
            this.router.navigate(['/homepage']);
          }
        }),
        catchError((error) => {
          console.error('Email verification error:', error);
          Swal.fire(
            'Error',
            error.error?.message || 'Email verification failed',
            'error'
          );
          return of(null);
        })
      );
  }

  // Ajouter cette méthode pour la redirection basée sur le rôle
 private redirectBasedOnRole(): void {
  if (this.isAdmin()) {
    this.router.navigate(['/admin/dashboard']);
  } else if (this.isInstaller()) {
    this.router.navigate(['/installer-home']);
  } else if (this.isClient()) {
    this.router.navigate(['/homepage']);
  } else {
    console.warn('No valid role found, redirecting to homepage');
    this.router.navigate(['/homepage']);
  }
}


  logout() {
    this.loggedUser = undefined!;
    this.loggedUserSubject.next(''); // Émettre une valeur vide
    this.roles = undefined!;
    this.token = undefined!;
    this.isloggedIn = false;
    this.setLoggedInStatus(false);
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('jwt');

      this.authState.updateAuthState(false);
    }
    
    this.router.navigate(['/login']);
  }

  getInstallers(): Observable<any[]> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http
      .get<any[]>(`${this.apiURL}/list-installateurs`, { headers })
      .pipe(
        catchError((error) => {
          console.error('Error fetching installers:', error);
          throw new Error('Failed to load installers. Please try again.');
        })
      );
  }

  /****
   * Hana modifier ces deux methodes
   * cause : Panier
   */
 // Dans AuthService - Amélioration des méthodes login et registerUser

// Méthode login améliorée pour migrer le panier après connexion
login(credentials: { username: string; password: string }): Observable<HttpResponse<any>> {
  return this.http.post<any>(`${this.apiURL}/login`, credentials, {
    observe: 'response',
    withCredentials: true,
  }).pipe(
    tap((response) => {
      const jwt = response.headers.get('Authorization');
      if (jwt) {
        this.handleSuccessfulAuth(jwt);
      }
    })
  );
}

registerUser(user: User): Observable<HttpResponse<User>> {
  return this.http.post<User>(`${this.apiURL}/register`, user, {
    observe: 'response',
  }).pipe(
    tap((response) => {
      const jwt = response.headers.get('Authorization');
      if (jwt) {
        this.handleSuccessfulAuth(jwt);
      }
    }),
    catchError((error) => {
      console.error('Registration error:', error);
      Swal.fire('Erreur', error.error?.message || 'Échec de l\'inscription', 'error');
      throw error;
    })
  );
}
private handleSuccessfulAuth(jwt: string): void {
  this.saveToken(jwt);
  this.setLoggedInStatus(true);
  
  // Migrate cart and then redirect
  this.cartService.migrateSessionCartToUser().pipe(
    catchError(error => {
      console.error('Cart migration error:', error);
      return of(null);
    }),
    finalize(() => this.redirectBasedOnRole())
  ).subscribe();
}
/*********************** */
// Changer de private à public
public setLoggedInStatus(status: boolean): void {
  this.isloggedIn = status;
  this.loggedInStatus.next(status);
  this.isLoggedInSubject.next(status);
}

  validateEmail(code: string, email?: string): Observable<User> {
    let url = `${this.apiURL}/verifyEmail/${code}`;
    if (email) {
      url += `?email=${encodeURIComponent(email)}`;
    }
    return this.http.get<User>(url).pipe(
      tap((user) => {
        this.regitredUser = user;
        this.roles = user.roles;
      })
    );
  }

  setRegistredUser(user: User) {
    this.regitredUser = user;
  }

  getRegistredUser() {
    return this.regitredUser;
  }

  updateProfile(username: string, newEmail?: string, newPassword?: string, currentPassword?: string): Observable<any> {
    const payload = { username, newEmail, newPassword, currentPassword };
    return this.http.put(`${this.apiURL}/updateProfile`, payload);
  }
  
  uploadProfileImage(file: File, username: string, currentPassword: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', username);
    formData.append('currentPassword', currentPassword);
  
    return this.http.post(`${this.apiURL}/uploadProfileImage`, formData);
  }

  getCurrentUserEmail(): Observable<string> {
    if (isPlatformBrowser(this.platformId) && this.token) {
      try {
        const decodedToken = this.jwtHelper.decodeToken(this.token);
        console.log('Email récupéré du token:', decodedToken?.email);
        return of(decodedToken?.email || '');
      } catch (error) {
        console.error('Error decoding token for email:', error);
      }
    }
    return of(''); // Return empty on server or when token is invalid
  }

  getUserProfile(): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<any>(`${this.apiURL}/userProfile`, { headers });
  }

  getAllClients(): Observable<User[]> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<User[]>(`${this.apiURL}/all`, { headers }).pipe(
      catchError((error) => {
        console.error('Error fetching clients:', error);
        throw new Error('Failed to load clients. Please try again.');
      })
    );
  }

  isClient(): boolean {
    const roles = this.getUserRoles();
    return roles.includes('CLIENT');
  }

  isAdmin(): boolean {
    const roles = this.getUserRoles();
    return roles.includes('ADMIN');
  }

  isInstaller(): boolean {
    const roles = this.getUserRoles();
    return roles.includes('INSTALLATEUR');
  }

  requestResetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiURL}/request-reset-password`, { email });
  }

  validateCode(email: string, code: string): Observable<any> {
    return this.http.post(`${this.apiURL}/validate-code`, { email, code });
  }

  resetPassword(email: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiURL}/reset-password`, {
      email,
      newPassword,
    });
  }

  hasAnyRole(requiredRoles: string[]): boolean {
    const userRoles = this.getUserRoles();
    return requiredRoles.some((role) => userRoles.includes(role));
  }

  getRequiredRoles(): string[] {
    return this.getUserRoles();
  }

  deactivateUser(userId: number): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(
      `${this.apiURL}/deactivate/${userId}`,
      {},
      { headers }
    );
  }

  activateUser(userId: number): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(`${this.apiURL}/activate/${userId}`, {}, { headers });
  }
  
  getUserId(): number | null {
    if (isPlatformBrowser(this.platformId)) {
        const token = localStorage.getItem('jwt');
        if (token) {
            try {
                const decodedToken = this.jwtHelper.decodeToken(token);
                // Vérifiez la structure de votre token pour voir où est stocké l'ID
                return decodedToken?.userId || decodedToken?.sub || null;
            } catch (error) {
                console.error('Error decoding token for userId:', error);
                return null;
            }
        }
    }
    return null;
}

getUserEmail(): string | null {
  if (isPlatformBrowser(this.platformId) ){
    const token = this.getToken();
    if (token) {
      try {
        const decodedToken = this.jwtHelper.decodeToken(token);
        console.log('Email from token:', decodedToken?.email); // Afficher l'email dans la console
        return decodedToken?.email || null;
      } catch (error) {
        console.error('Error decoding token for email:', error);
      }
    }
  }
  return null;
}

/**
   * Rafraîchit le token JWT
   */
refreshToken(): Observable<string> {
  if (!isPlatformBrowser(this.platformId)) {
    return throwError(() => new Error('Refresh token impossible côté serveur'));
  }

  const currentToken = this.getToken();
  if (!currentToken) {
    return throwError(() => new Error('Aucun token disponible pour le rafraîchissement'));
  }

  return this.http.post<{token: string}>(
    `${this.apiURL}/refresh-token`, 
    {}, 
    { headers: new HttpHeaders().set('Authorization', `Bearer ${currentToken}`) }
  ).pipe(
    tap(response => {
      const newToken = response.token;
      this.saveToken(newToken);
      console.log('Token rafraîchi avec succès');
    }),
    map(response => response.token),
    catchError(error => {
      console.error('Erreur lors du rafraîchissement du token:', error);
      this.logout();
      return throwError(() => new Error('Échec du rafraîchissement du token'));
    })
  );
}


}