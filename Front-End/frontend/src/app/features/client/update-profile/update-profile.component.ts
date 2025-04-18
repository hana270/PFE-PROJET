import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/authentication/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-update-profile',
  templateUrl: './update-profile.component.html',
  styleUrls: ['./update-profile.component.css']
})
export class UpdateProfileComponent implements OnInit {
  emailForm: FormGroup;
  passwordForm: FormGroup;
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
      { validators: [this.passwordMatchValidator, this.differentPasswordValidator] }
    );
  }

  ngOnInit(): void {
    this.loadCurrentEmail();
    this.loadCurrentImage();
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
        this.profileImageUrl = user.profileImage
          ? `http://localhost:8002/uploads/${user.profileImage}`
          : 'assets/default-profile.jpg';
        this.cdr.detectChanges();
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

  differentPasswordValidator(form: FormGroup): { [key: string]: boolean } | null {
    const currentPassword = form.get('currentPassword')?.value;
    const newPassword = form.get('newPassword')?.value;
    return currentPassword !== newPassword ? null : { samePassword: true };
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
          this.onUpdateProfileImage(currentPassword);
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
         this.showMessage(error.error.message || 'Une erreur est survenue lors de la mise à jour de l\'email.', false);
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
 
   onUpdateProfileImage(currentPassword: string): void {
     if (!this.selectedFile) {
       this.showMessage('Veuillez sélectionner une image.', false);
       return;
     }
 
     const username = this.authService.loggedUser;
 
     this.authService.uploadProfileImage(this.selectedFile, username, currentPassword).subscribe({
       next: (response: any) => {
         this.showMessage('Photo de profil mise à jour avec succès.', true);
         this.selectedFile = null;
         this.profileImageUrl = `${response.imageUrl}?t=${new Date().getTime()}`;
         this.cdr.detectChanges();
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
       background: isSuccess ? '#e8f5e9' : '#ffebee', // Couleur de fond différente pour succès/erreur
       iconColor: isSuccess ? '#4caf50' : '#f44336', // Couleur de l'icône différente pour succès/erreur
     });
   }
 }