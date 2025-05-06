import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-installer-register',
  templateUrl: './installer-register.component.html',
  styleUrls: ['./installer-register.component.css']
})
export class InstallerRegisterComponent {
  registerForm: FormGroup;
  isLoading: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8,}$/)]],
      defaultAddress: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { mismatch: true };
    }
    return null;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  register() {
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
      
      Swal.fire({
        icon: 'error',
        title: 'Formulaire incomplet',
        text: 'Veuillez remplir tous les champs correctement',
        confirmButtonColor: '#3a7bd5',
      });
      return;
    }
  
    this.isLoading = true;
  
    const formData = this.registerForm.value;
    // Supprimer confirmPassword avant l'envoi
    delete formData.confirmPassword;
  
    this.authService.registerInstaller(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // Stocker l'email pour la vérification
        localStorage.setItem('pendingVerificationEmail', this.registerForm.value.email);
        
        Swal.fire({
          icon: 'success',
          title: 'Inscription réussie !',
          html: `
            <p>Un code de vérification a été envoyé à votre adresse email.</p>
          `,
          confirmButtonColor: '#3a7bd5',
        }).then(() => {
          // Redirection vers la page de vérification
          this.router.navigate(['/verifEmail'], {
            queryParams: { email: this.registerForm.value.email }
          });
        });
      },
      error: (error) => {
        this.isLoading = false;
        let errorMessage = error.error?.message || 'Une erreur est survenue lors de l\'inscription';
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          html: `
            <p>${errorMessage}</p>
            ${error.error?.details ? `<p>${error.error.details}</p>` : ''}
          `,
          confirmButtonColor: '#3a7bd5',
        });
      }
    });
  }
}