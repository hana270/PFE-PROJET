import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  SocialAuthService,
  GoogleLoginProvider,
  SocialUser,
} from '@abacritt/angularx-social-login';
import Swal from 'sweetalert2';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/authentication/auth.service';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  user = new User();
  err: number = 0;
  message: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private socialAuthService: SocialAuthService
  ) {}

  ngOnInit(): void {
    /*
    this.loadGoogleScript()
      .then(() => {
        this.initializeGoogleSignIn();
      })
      .catch((error) => {
        console.error('Failed to load Google script', error);
        Swal.fire('Erreur', 'Problème de connexion Google. Réessayez.', 'error');
      });  */
  }
/*
  loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById('google-signin-script')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-signin-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google script'));
      document.head.appendChild(script);
    });
  }*/
    loadGoogleScript(): void {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

  initializeGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts) {
      console.error('Google API not loaded yet.');
      setTimeout(() => this.initializeGoogleSignIn(), 500);
      return;
    }

    // Clear any existing button
    const buttonContainer = document.getElementById('google-signin-button');
    if (buttonContainer) {
      buttonContainer.innerHTML = '';
    }

    google.accounts.id.initialize({
      client_id:
        '133465243893-f4gk1sbs2adeoc4i2sapighi25pai6qt.apps.googleusercontent.com',
      callback: this.handleCredentialResponse.bind(this),
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    google.accounts.id.renderButton(
      document.getElementById('google-signin-button'),
      {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 240,
      }
    );
  }

  handleCredentialResponse(response: any) {
    if (!response.credential) {
      console.error('No credential received');
      return;
    }

    const decodedToken = this.authService.deJWT(response.credential);
    const email = decodedToken.email;
    const name = decodedToken.name;

    const socialUser: SocialUser = {
      provider: 'GOOGLE',
      id: decodedToken.sub,
      email: email,
      name: name,
      photoUrl: decodedToken.picture,
      firstName: decodedToken.given_name,
      lastName: decodedToken.family_name,
      authToken: response.credential,
      idToken: response.credential,
      authorizationCode: '',
      response: response,
    };

    this.handleSocialLogin(socialUser);
  }

  handleSocialLogin(user: SocialUser) {
    this.isLoading = true;
    console.log('Initiating social login for user:', user.email);

    this.authService.socialLogin(user).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.isLoading = false;
        if (response.headers.get('Authorization')) {
          const jwt = response.headers.get('Authorization');
          this.authService.saveToken(jwt);
          this.authService.setLoggedInStatus(true);

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
        console.error('Login error:', error);
        let errorMessage = 'Connexion impossible. Réessayez.';
        if (error.error?.message === 'EMAIL_NOT_VERIFIED') {
          errorMessage = 'Validez le code reçu par email pour continuer.';
        }
        Swal.fire('Erreur', errorMessage, 'error');
        this.isLoading = false;
      },
    });
  }

// login.component.ts
onLoggedin() {
  this.isLoading = true;
  const credentials = {
      username: this.user.username,
      password: this.user.password,
  };

  this.authService.login(credentials).subscribe({
      next: () => {
          this.redirectBasedOnRole();
      },
      error: (error) => {
          this.handleError('Erreur', error);
      },
      complete: () => {
          this.isLoading = false;
      },
  });
}

private handleError(title: string, error: any) {
  this.err = 1;
  this.message = error.error?.message || error.message || 'Erreur inconnue.';
  Swal.fire({
      icon: 'error',
      title: title,
      text: this.message,
  });
}

  private redirectBasedOnRole() {
    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.authService.isInstaller()) {
      this.router.navigate(['/installer-home']);
    } else if (this.authService.isClient()) {
      this.router.navigate(['/homepage']);
    } else {
      this.handleError('Erreur', 'Rôle non reconnu');
    }
  }


  // Fonction pour basculer la visibilité du mot de passe
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}