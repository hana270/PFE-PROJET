import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-validate-code',
  templateUrl: './validate-code.component.html',
  styleUrls: ['./validate-code.component.css'],
})
export class ValidateCodeComponent {
  validateCodeForm: FormGroup;
  loading: boolean = false; // Ajout du loading state
  email: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.email = this.route.snapshot.queryParams['email'];
    this.validateCodeForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    });
  }

  onSubmit() {
    if (this.validateCodeForm.invalid) {
      return;
    }

    this.loading = true; // Activation du loading
    const code = this.validateCodeForm.value.code;

    this.authService.validateCode(this.email, code).subscribe({
      next: () => {
        this.loading = false; // Désactivation du loading
        Swal.fire({
          icon: 'success',
          title: 'Code valide',
          text: 'Vous pouvez maintenant réinitialiser votre mot de passe.',
          confirmButtonText: 'OK',
        }).then(() => {
          this.router.navigate(['/reset-password'], {
            queryParams: { email: this.email },
          });
        });
      },
      error: (err) => {
        this.loading = false; // Désactivation du loading en cas d'erreur
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text:
            err.error?.message || 'Le code est invalide. Veuillez réessayer.',
          confirmButtonText: 'OK',
        });
      },
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
