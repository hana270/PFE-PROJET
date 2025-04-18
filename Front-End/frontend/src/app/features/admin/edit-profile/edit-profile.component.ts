import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css'],
})
export class EditProfileComponent implements OnInit {
  emailForm: FormGroup;
  passwordForm: FormGroup;
  profileImageForm: FormGroup;
  message: string = '';
  isSuccess: boolean = false;
  showCurrentPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;
  currentEmail: string = '';
  activeTab: string = 'email';
  profileImageUrl: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.emailForm = this.fb.group({
      newEmail: ['', [Validators.email, Validators.required]],
      currentPassword: ['', [Validators.required]],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator }
    );

    this.profileImageForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      file: [null, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadCurrentEmail();
    this.loadCurrentImage(); // Charger l'image de profil actuelle
  }

  private loadCurrentEmail(): void {
    this.authService.getUserProfile().subscribe({
      next: (user: any) => {
        this.currentEmail = user.email;
      },
      error: (error: any) => {
        this.showMessage('Erreur lors de la récupération des informations', false);
      },
    });
  }

  private loadCurrentImage(): void {
    this.authService.getUserProfile().subscribe({
      next: (user: any) => {
        console.log('User profile response:', user);
        this.profileImageUrl = user.profileImage 
          ? `http://localhost:8002/uploads/${user.profileImage}` 
          : 'assets/default-profile.jpg';
        console.log('Profile image URL:', this.profileImageUrl);
        this.cdr.detectChanges(); // Force la détection des changements
      },
      error: (error: any) => {
        this.showMessage('Erreur lors de la récupération de l\'image de profil', false);
      },
    });
  }

  passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleShowCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleShowNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) {
      this.promptForCurrentPassword().then((currentPassword) => {
        if (currentPassword) {
          this.profileImageForm.get('currentPassword')?.setValue(currentPassword);
          this.onUpdateProfileImage();
        }
      });
    }
  }

  private promptForCurrentPassword(): Promise<string> {
    return Swal.fire({
      title: 'Valider le mot de passe actuel',
      input: 'password',
      inputPlaceholder: 'Entrez votre mot de passe actuel',
      showCancelButton: true,
      confirmButtonText: 'Valider',
      cancelButtonText: 'Annuler',
      inputValidator: (value) => {
        if (!value) {
          return 'Le mot de passe est requis !';
        }
        return null;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        return result.value;
      }
      return null;
    });
  }

  onUpdateEmail(): void {
    if (this.emailForm.invalid) {
      this.showMessage('Veuillez remplir tous les champs obligatoires.', false);
      return;
    }

    const { newEmail, currentPassword } = this.emailForm.value;
    const username = this.authService.loggedUser;

    this.authService.updateProfile(username, newEmail, undefined, currentPassword).subscribe({
      next: () => {
        this.showMessage('Email mis à jour avec succès.', true);
        this.emailForm.reset();
        this.loadCurrentEmail();
      },
      error: (error: any) => {
        this.showMessage(error.error.message || 'Une erreur est survenue.', false);
      },
    });
  }

  onUpdatePassword(): void {
    if (this.passwordForm.invalid) {
      this.showMessage('Veuillez remplir tous les champs obligatoires.', false);
      return;
    }

    const { newPassword, currentPassword } = this.passwordForm.value;
    const username = this.authService.loggedUser;

    this.authService.updateProfile(username, undefined, newPassword, currentPassword).subscribe({
      next: () => {
        this.showMessage('Mot de passe mis à jour avec succès.', true);
        this.passwordForm.reset();
      },
      error: (error: any) => {
        this.showMessage(error.error.message || 'Une erreur est survenue.', false);
      },
    });
  }

  onUpdateProfileImage(): void {
    if (!this.selectedFile) {
      this.showMessage('Veuillez sélectionner une image.', false);
      return;
    }
  
    const currentPassword = this.profileImageForm.get('currentPassword')?.value;
    if (!currentPassword) {
      this.showMessage('Le mot de passe actuel est requis.', false);
      return;
    }
  
    const username = this.authService.loggedUser;
  
    this.authService.uploadProfileImage(this.selectedFile, username, currentPassword).subscribe({
      next: (response: any) => {
        this.showMessage('Photo de profil mise à jour avec succès.', true);
        this.selectedFile = null;
  
        // Ajouter un paramètre unique (timestamp) à l'URL de l'image
        const timestamp = new Date().getTime();
        this.profileImageUrl = `${response.imageUrl}?t=${timestamp}`;
  
        // Forcer le rechargement de l'image
        this.cdr.detectChanges(); // Force la détection des changements
      },
      error: (error: any) => {
        this.showMessage(error.error.message || 'Erreur lors de la mise à jour de la photo de profil.', false);
      },
    });
  }

  private showMessage(message: string, isSuccess: boolean): void {
    Swal.fire({
      icon: isSuccess ? 'success' : 'error',
      title: isSuccess ? 'Succès' : 'Erreur',
      text: message,
      timer: 2000,
      showConfirmButton: false,
    });
  }
}