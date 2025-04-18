import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent {
  resetPasswordForm: FormGroup;
  loading: boolean = false; // Ajout du loading state
  email: string;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.email = this.route.snapshot.queryParams['email'];
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('newPassword')?.value === form.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onSubmit() {
    if (this.resetPasswordForm.invalid) {
      return;
    }

    this.loading = true; // Activation du loading
    const newPassword = this.resetPasswordForm.value.newPassword;

    this.authService.resetPassword(this.email, newPassword).subscribe({
      next: () => {
        this.loading = false; // Désactivation du loading
        Swal.fire({
          icon: 'success',
          title: 'Mot de passe réinitialisé',
          text: 'Votre mot de passe a été réinitialisé avec succès.',
          confirmButtonText: 'OK',
        }).then(() => {
          this.router.navigate(['/login']);
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