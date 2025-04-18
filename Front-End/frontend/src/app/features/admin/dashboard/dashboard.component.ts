import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Vérifiez si l'utilisateur est authentifié
    if (!this.authService.getToken()) {
      this.router.navigate(['/admin/signin']); // Rediriger vers la page de connexion admin
    }
  }

  // Méthode pour gérer la déconnexion
  logout(): void {
    this.authService.logout(); // Appeler la méthode de déconnexion du service
    this.router.navigate(['/admin/signin']); // Rediriger vers la page de connexion admin
  }
}