import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/authentication/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

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
    private authService: AuthService,
    private router: Router
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

  ngOnInit() {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/admin/signin']);
    }
  }

  async sendInvitation() {
    if (this.invitationForm.invalid || this.isLoading) return;

    this.isLoading = true;
    
    const confirmation = await Swal.fire({
      title: 'Confirmer l\'envoi',
      text: `Envoyer une invitation à ${this.invitationForm.value.email} ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, envoyer',
      cancelButtonText: 'Annuler'
    });

    if (!confirmation.isConfirmed) {
      this.isLoading = false;
      return;
    }

    try {
      await this.authService.sendInstallerInvitation(
        this.invitationForm.value.email
      ).toPromise();
      
      await this.showSuccessAlert();
      this.invitationForm.reset();
    } catch (error) {
      this.showErrorAlert(error);
    } finally {
      this.isLoading = false;
    }
  }

  private async showSuccessAlert() {
    await Swal.fire({
      icon: 'success',
      title: 'Invitation envoyée!',
      html: `
        <div style="text-align: left;">
          <p>Un email professionnel a été envoyé avec succès à <strong>${this.invitationForm.value.email}</strong>.</p>
          <p>Le nouveau membre recevra :</p>
          <ul>
            <li>Un message de bienvenue personnalisé</li>
            <li>Des instructions claires pour finaliser son inscription</li>
            <li>Toutes les informations nécessaires pour commencer</li>
          </ul>
        </div>
      `,
      confirmButtonText: 'Fermer',
      confirmButtonColor: '#4CAF50',
      customClass: {
        popup: 'professional-swal'
      }
    });
  }

  private showErrorAlert(error: any) {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: this.getErrorMessage(error),
      confirmButtonColor: '#F44336',
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 400) return 'Email invalide ou déjà utilisé';
    if (error.status === 404) return 'Service indisponible';
    return 'Une erreur est survenue lors de l\'envoi';
  }
}