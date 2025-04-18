import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  myForm!: FormGroup;
  err!: string;
  loading: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.myForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    this.myForm = this.formBuilder.group(
      {
        username: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onRegister() {
    if (this.myForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.registerUser(this.myForm.value).subscribe({
      next: (response) => {
        this.loading = false;

        Swal.fire({
          icon: 'success',
          title: 'Inscription réussie',
          text: 'Un code de validation a été envoyé à votre adresse email. Veuillez vérifier votre boîte de réception.',
          confirmButtonText: 'OK',
        }).then(() => {
          this.router.navigate(['/verifEmail'], {
            queryParams: { email: this.myForm.value.email },
          });
        });
      },
      error: (err) => {
        this.loading = false;

        let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
        if (err.error?.errorCode === 'USER_EMAIL_ALREADY_EXISTS') {
          errorMessage =
            'Cet email est déjà utilisé. Veuillez utiliser une autre adresse email.';
        } else if (err.error?.message === 'EMAIL_NOT_VERIFIED') {
          errorMessage =
            "Vous n'avez pas validé le code envoyé à votre email. Veuillez vérifier votre boîte de réception.";
        }

        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK',
        });
      },
    });
  }

  onSubmit() {
    if (this.myForm.invalid) {
      return;
    }
    console.log(this.myForm.value);
  }
}
