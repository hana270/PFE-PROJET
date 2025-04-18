import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-installer-register',
  templateUrl: './installer-register.component.html',
  styleUrls: ['./installer-register.component.css']
})
export class InstallerRegisterComponent {
  user = {
    username: '',
    password: '',
    email: ''
  };

  isLoading: boolean = false;

  constructor(private http: HttpClient, private router: Router) {}

  register() {
    if (this.isLoading) return;
  
    this.isLoading = true;
  
    this.http.post('http://localhost:8002/users/register-installer', this.user, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(
      (response) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'success',
          title: 'Inscription réussie !',
          text: 'Votre compte a été créé avec succès.',
          confirmButtonColor: '#007bff',
        });
        this.router.navigate(['/login']); // Redirection vers la page de connexion
      },
      (error) => {
        this.isLoading = false;
        let errorMessage = 'Une erreur est survenue lors de l\'inscription.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message; // Affiche le message d'erreur du serveur
        }
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonColor: '#007bff',
        });
        console.error('Erreur:', error);
      }
    );
  }
}