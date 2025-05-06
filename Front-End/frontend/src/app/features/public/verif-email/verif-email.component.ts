import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-verif-email',
  templateUrl: './verif-email.component.html',
})
export class VerifEmailComponent implements OnInit {
  email: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  verifForm: FormGroup;
  codeResent: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private fb: FormBuilder
  ) {
    this.verifForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  ngOnInit(): void {
    // Récupérer l'email stocké localement pour la vérification
    if (isPlatformBrowser(this.platformId)) {
      const storedEmail = localStorage.getItem('pendingVerificationEmail');
      if (storedEmail) {
        this.email = storedEmail;
      }
    }

    // Vérifier aussi si l'email est passé dans les paramètres de l'URL
    this.route.queryParams.subscribe((params) => {
      if (params['email']) {
        this.email = params['email'];
      }
    });
  }

  private showFieldErrors(): void {
    // Marquer tous les champs comme touchés pour afficher les erreurs
    Object.keys(this.verifForm.controls).forEach((key) => {
      const control = this.verifForm.get(key);
      control?.markAsTouched();
    });

    this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire.';
  }

  private handleError(err: any): void {
    console.error('Erreur de vérification:', err);

    let userMessage =
      "Une erreur inattendue s'est produite. Veuillez réessayer.";
    let technicalDetails = '';

    if (err.error) {
      // Erreurs connues du serveur
      if (
        err.error.errorCode === 'INVALID_TOKEN' ||
        err.error.error === 'INVALID_CODE'
      ) {
        userMessage =
          'Le code de vérification est incorrect. Veuillez saisir le code exact reçu par email.';
      } else if (err.error.errorCode === 'EXPIRED_TOKEN') {
        userMessage = 'Le code a expiré. Veuillez demander un nouveau code.';
      } else if (err.error.error === 'USER_NOT_FOUND') {
        userMessage =
          "Aucun compte n'est associé à cette adresse email. Veuillez vous inscrire à nouveau.";
      } else if (err.error.error === 'ALREADY_VERIFIED') {
        userMessage =
          'Votre compte est déjà vérifié. Vous pouvez vous connecter.';
        this.router.navigate(['/login']);
      } else if (err.error.error === 'CODE_REQUIRED') {
        userMessage = 'Veuillez entrer le code de vérification reçu par email.';
      } else if (err.error.error === 'EMAIL_REQUIRED') {
        userMessage = 'Une adresse email est requise pour la vérification.';
      } else if (err.error.message) {
        // Message d'erreur personnalisé du serveur
        userMessage = err.error.message;
      }
    } else if (err.status === 0) {
      userMessage =
        'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
    } else if (err.status === 504) {
      userMessage =
        'Le serveur met trop de temps à répondre. Veuillez réessayer plus tard.';
    }

    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: userMessage,
      confirmButtonColor: '#3a7bd5',
    });
  }

  onSubmit(): void {
    if (this.verifForm.invalid) {
        this.showFieldErrors();
        return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.verifyEmail(this.email, this.verifForm.value.code).subscribe({
        next: ({user, roles}) => {
            this.loading = false;
            
            if (isPlatformBrowser(this.platformId)) {
                localStorage.removeItem('pendingVerificationEmail');
            }

            const isInstaller = roles.includes('INSTALLATEUR');
            
            Swal.fire({
                icon: 'success',
                title: 'Bienvenue !',
                html: `Votre compte a été activé avec succès.`,
                confirmButtonText: 'Continuer'
            }).then(() => {
                this.router.navigate([isInstaller ? '/installer-home' : '/homepage']);
            });
        },
        error: (err) => {
            this.loading = false;
            
            if (err.message.includes('Code de vérification invalide')) {
                this.errorMessage = "Le code saisi est incorrect. Veuillez utiliser le dernier code reçu par email.";
                this.verifForm.get('code')?.setErrors({ invalid: true });
            } else {
                this.errorMessage = err.message || "Une erreur est survenue";
            }
        }
    });
}

  resendVerificationCode(): void {
    if (!this.email) {
      this.errorMessage =
        "Nous n'avons pas pu trouver votre adresse email. Veuillez réessayer.";
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.codeResent = false;

    this.authService.resendVerificationCode(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.codeResent = true;
        this.successMessage =
          'Un nouveau code a été envoyé à votre adresse email. Veuillez utiliser ce nouveau code.';

        // Réinitialiser le formulaire
        this.verifForm.reset();
      },
      error: (err) => {
        this.loading = false;
        if (err.error?.error === 'ALREADY_VERIFIED') {
          this.successMessage =
            'Votre compte est déjà vérifié. Vous pouvez vous connecter.';
          setTimeout(() => this.router.navigate(['/login']), 3000);
        } else {
          this.handleError(err);
        }
      },
    });
  }
}
