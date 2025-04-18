import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/authentication/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-send-installer-invitation',
  templateUrl: './send-installer-invitation.component.html',
  styleUrls: ['./send-installer-invitation.component.scss'],
})
export class SendInstallerInvitationComponent implements OnInit {
  invitationForm: FormGroup;
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.invitationForm = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|com\.tn|fr|tn)$/),
        ],
      ],
    });
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/admin/signin']);
    }
  }

  async sendInvitation() {
    if (this.invitationForm.valid && !this.isLoading) {
      this.isLoading = true;
      const apiUrl = 'http://localhost:8002/users/send-installer-invitation';

      try {
        await this.http.post(apiUrl, { email: this.invitationForm.get('email')?.value }).toPromise();
        Swal.fire({
          icon: 'success',
          title: 'Succès !',
          text: 'L\'invitation a été envoyée avec succès.',
          confirmButtonColor: '#333',
        });
        this.invitationForm.reset();
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors de l\'envoi de l\'invitation.',
          confirmButtonColor: '#333',
        });
        console.error('Erreur:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }

  showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }
}