import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-request-reset-password',
  templateUrl: './request-reset-password.component.html',
  styleUrls: ['./request-reset-password.component.css']
})
export class RequestResetPasswordComponent {
  requestResetForm: FormGroup;
  loading: boolean = false; // Ajout du loading state

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.requestResetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.requestResetForm.invalid) {
      return;
    }

    this.loading = true; // Activation du loading
    const email = this.requestResetForm.value.email;

    this.authService.requestResetPassword(email).subscribe({
      next: () => {
        this.loading = false; // Désactivation du loading
        Swal.fire({
          icon: 'success',
          title: 'Code envoyé',
          text: 'Un code de validation a été envoyé à votre email.',
          confirmButtonText: 'OK',
        }).then(() => {
          this.router.navigate(['/validate-code'], { queryParams: { email } });
        });
      },
      error: (err) => {
        this.loading = false; // Désactivation du loading en cas d'erreur
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: err.error?.message || 'Une erreur est survenue.',
          confirmButtonText: 'OK',
        });
      },
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}