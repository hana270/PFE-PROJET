import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../core/authentication/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-verif-email',
  templateUrl: './verif-email.component.html',
})
export class VerifEmailComponent implements OnInit {
  code: string = '';
  user: User = new User();
  err = '';
  email: string = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.user = this.authService.regitredUser;

    // Récupérer l'email stocké localement pour la vérification
    if (isPlatformBrowser(this.platformId)) {
      const storedEmail = localStorage.getItem('pendingVerificationEmail');
      if (storedEmail) {
        this.email = storedEmail;
        console.log('Email for verification:', this.email);
      }
    }

    // Vérifier aussi si l'email est passé dans les paramètres de l'URL
    this.route.queryParams.subscribe((params) => {
      if (params['email']) {
        this.email = params['email'];
        console.log('Email from URL params:', this.email);
      }
    });
  }


  onValidateEmail() {
    if (!this.code) {
        Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Veuillez entrer le code de vérification',
            confirmButtonText: 'OK',
        });
        return;
    }

    console.log('Validating code:', this.code);
    console.log('For email:', this.email || this.user.email);

    // Utiliser l'email récupéré si disponible
    const emailToUse = this.email || this.user.email;

    // Appeler la méthode validateEmail avec les deux arguments
    this.authService.validateEmail(this.code, emailToUse).subscribe({
        next: (res) => {
            Swal.fire({
                icon: 'success',
                title: 'Succès',
                text: 'Votre email a été vérifié avec succès',
                confirmButtonText: 'OK',
            }).then(() => {
                // Nettoyer les données temporaires
                if (isPlatformBrowser(this.platformId)) {
                    localStorage.removeItem('pendingVerificationEmail');
                }

                // Debug: Log the user roles
                console.log('Client roles:', this.authService.roles);

              this.router.navigate(['/homepage']);
              
            });
        },
        error: (err: any) => {
            console.error('Validation error:', err);
            if (err.error?.errorCode === "INVALID_TOKEN") {
                this.err = "Votre code n'est pas valide !";
            } else if (err.error?.errorCode === "EXPIRED_TOKEN") {
                this.err = "Votre code a expiré !";
            } else {
                this.err = "Une erreur est survenue. Veuillez réessayer.";
            }

            // Show SweetAlert2 error message
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: this.err,
                confirmButtonText: 'OK',
            });
        },
    });
}
  validateCode() {
    this.authService.verifyEmail(this.email, this.code).subscribe({
      next: () => {
        Swal.fire('Success', 'Email verified successfully', 'success');
        this.router.navigate(['/homepage']);
      },
      error: (error) => {
        Swal.fire(
          'Error',
          error.error?.message || 'Email verification failed',
          'error'
        );
      },
    });
  }
}
