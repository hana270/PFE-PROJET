import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SocialUser } from '@abacritt/angularx-social-login';
import Swal from 'sweetalert2';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  user: User = new User();
  err: number = 0;
  message: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    console.log('LoginComponent initialized');
    
    // Debug logs
    if (typeof this.authService.isLoggedIn !== 'undefined') {
      console.log('Login state:', this.authService.isLoggedIn);
      
      // Check for tokens in localStorage
      if (localStorage.getItem('jwt')) {
        console.log('JWT token found in localStorage');
      }
      
      if (localStorage.getItem('token')) {
        console.log('Token found in localStorage');
      }
    }
  }

  handleCredentialResponse(response: any) {
    if (!response.credential) {
      console.error('No credential received');
      return;
    }

    try {
      // Use jwt-decode directly to avoid the circular reference issue
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const email = payload.email;
      const name = payload.name;

      const socialUser: SocialUser = {
        provider: 'GOOGLE',
        id: payload.sub,
        email: email,
        name: name,
        photoUrl: payload.picture,
        firstName: payload.given_name,
        lastName: payload.family_name,
        authToken: response.credential,
        idToken: response.credential,
        authorizationCode: '',
        response: response,
      };

      this.handleSocialLogin(socialUser);
    } catch (error) {
      console.error('Error parsing Google credential:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Could not process Google authentication response',
      });
    }
  }

  handleSocialLogin(user: SocialUser) {
    this.isLoading = true;
    console.log('Initiating social login for user:', user.email);

    this.authService.socialLogin(user).subscribe({
      next: (response) => {
        console.log('Social login successful:', response);
        this.isLoading = false;
        
        // Handle different response formats
        let token = null;
        
        // Check if token is in headers
        if (response.headers && response.headers.get('Authorization')) {
          token = response.headers.get('Authorization');
        } 
        // Check if token is in response body
        else if (response.body && (response.body.token || response.body.jwt)) {
          token = response.body.token || response.body.jwt;
        }
        
        if (token) {
          this.authService.saveToken(token);
          this.authService.setLoggedInStatus(true);
          
          // Check if email verification is required
          if (response.body?.message === "Vérification d'email requise") {
            localStorage.setItem('pendingVerificationEmail', user.email);
            this.router.navigate(['/verifEmail']);
          } else {
            this.redirectBasedOnRole();
          }
        } else {
          this.router.navigate(['/verifEmail']);
        }
      },
      error: (error) => {
        console.error('Social login error:', error);
        let errorMessage = 'La connexion a échoué. Veuillez réessayer.';
        if (error.message) {
          errorMessage = error.message;
        }
        Swal.fire({
          icon: 'error',
          title: 'Connexion impossible',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
        this.isLoading = false;
      },
    });
  }


// Modifications à apporter au LoginComponent

async onLoggedin() {
  this.isLoading = true;

  try {
    // 1. Validation
    if (!this.user.username || !this.user.password) {
      throw new Error('Veuillez renseigner votre nom d\'utilisateur et mot de passe');
    }

    // 2. Appel au service
    const response = await this.authService.login({
      username: this.user.username,
      password: this.user.password
    }).toPromise();

    // 3. Vérification du stockage et tentative de récupération si nécessaire
    const storedJwt = localStorage.getItem('jwt');
    const storedToken = localStorage.getItem('token');
    
    if (!storedJwt && storedToken) {
      // Si token existe mais pas jwt, réparer
      localStorage.setItem('jwt', storedToken);
      console.log('JWT restauré depuis token après login');
    }
    
    if (!storedToken && storedJwt) {
      // Si jwt existe mais pas token, réparer
      localStorage.setItem('token', storedJwt);
      console.log('Token restauré depuis jwt après login');
    }
    
    if (!storedJwt && !storedToken) {
      throw new Error('Les tokens de connexion n\'ont pas été stockés correctement');
    }
    
    console.log('Tokens après login:', {
      jwt: localStorage.getItem('jwt'),
      token: localStorage.getItem('token')
    });

    // 4. Vérifier l'intégrité de l'authentification
    this.authService.verifyAuthIntegrity();

    // 5. Redirection
    await this.redirectBasedOnRole();
    
    // 6. Confirmation
    Swal.fire({
      icon: 'success',
      title: 'Connexion réussie',
      text: 'Bienvenue sur votre espace personnel',
      timer: 2000,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Gestion type-safe de l'erreur
    let errorMessage = 'Une erreur est survenue';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as { message: string }).message;
    }
  
    this.handleError('Échec de connexion', errorMessage);
  } finally {
    this.isLoading = false;
  } 
}

// Ne pas appeler clearSession dans le login component
private handleError(title: string, errorMessage: string) {
  this.err = 1;
  this.message = errorMessage;
  
  Swal.fire({
    icon: 'error',
    title: title,
    text: errorMessage,
    confirmButtonText: 'OK',
    confirmButtonColor: '#3085d6'
  });
}

private redirectBasedOnRole() {
  try {
    console.log('Redirecting based on role');
    // Vérifier l'intégrité avant de rediriger
    this.authService.verifyAuthIntegrity();
    
    if (this.authService.isAdmin()) {
      console.log('Detected admin role, redirecting to admin dashboard');
      this.router.navigate(['/admin/dashboard']);
    } else if (this.authService.isInstaller()) {
      console.log('Detected installer role, redirecting to installer home');
      this.router.navigate(['/installer-home']);
    } else if (this.authService.isClient()) {
      console.log('Detected client role, redirecting to homepage');
      this.router.navigate(['/homepage']);
    } else {
      console.log('No specific role detected, redirecting to homepage');
      this.router.navigate(['/homepage']);
    }
    
    // Vérifier à nouveau après la redirection
    setTimeout(() => {
      console.log('État après redirection:', {
        jwt: localStorage.getItem('jwt'),
        token: localStorage.getItem('token')
      });
    }, 500);
  } catch (error) {
    console.error('Error during role-based redirection:', error);
    this.router.navigate(['/homepage']);
  }
}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}