import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Categorie } from '../../../../core/models/categorie.models';
import { CategorieService } from '../../../../core/services/categorie.service';
import Swal from 'sweetalert2';
import { AuthService } from '../../../../core/authentication/auth.service';

@Component({
  selector: 'app-add-categorie',
  templateUrl: './add-categorie.component.html',
  styleUrls: ['./add-categorie.component.css'],
})
export class AddCategorieComponent implements OnInit {
  newCategorie: Categorie = new Categorie();

  constructor(private categorieService: CategorieService, private router: Router
    ,private authService:AuthService
  ) {}

  ngOnInit(): void {}

  // Ajouter une catégorie
  addCategorie(): void {
    this.categorieService.addCategorie(this.newCategorie).subscribe(
      () => {
        Swal.fire('Succès !', 'La catégorie a été ajoutée.', 'success');
        this.router.navigate(['/admin/list-categories']);
      },
      (error) => {
        Swal.fire('Erreur !', 'Une erreur est survenue lors de l\'ajout.', 'error');
      }
    );
  }

  logout(): void {
    this.authService.logout(); // Appeler la méthode de déconnexion du service
    this.router.navigate(['/admin/signin']); // Rediriger vers la page de connexion admin
  }
}