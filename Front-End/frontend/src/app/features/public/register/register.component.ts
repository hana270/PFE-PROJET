import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  myForm: FormGroup;
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.myForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8,}$/)]],
      defaultAddress: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {}

  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onRegister(): void {
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }
  
    this.loading = true;
    const formData = this.myForm.value;
    
    // Normaliser l'email
    const normalizedEmail = formData.email.toLowerCase().trim();
    
    const registrationData = {
      username: formData.username,
      email: normalizedEmail,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      defaultAddress: formData.defaultAddress || ''
    };
  
    this.authService.registerUser(registrationData).subscribe({
      next: (response: any) => {
        this.loading = false;
        Swal.fire({
          icon: 'success',
          title: 'Inscription réussie',
          text: 'Veuillez vérifier votre email pour activer votre compte',
          confirmButtonText: 'Continuer'
        }).then(() => {
          this.router.navigate(['/verifEmail'], { 
            queryParams: { email: normalizedEmail } 
          });
        });
      },
      error: (error) => {
        this.loading = false;
        let errorMessage = 'Une erreur est survenue lors de l\'inscription';
        
        if (error.error) {
          if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.error === 'EMAIL_ALREADY_EXISTS') {
            errorMessage = 'Cet email est déjà utilisé';
          } else if (error.error.error === 'USERNAME_ALREADY_EXISTS') {
            errorMessage = 'Ce nom d\'utilisateur est déjà utilisé';
          }
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur d\'inscription',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
      }
    });
  }
}