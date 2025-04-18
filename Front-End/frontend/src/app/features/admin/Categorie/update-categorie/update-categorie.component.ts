import { AuthService } from './../../../../core/authentication/auth.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Categorie } from '../../../../core/models/categorie.models';
import { CategorieService } from '../../../../core/services/categorie.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-update-categorie',
  templateUrl: './update-categorie.component.html',
  styleUrls: ['./update-categorie.component.css'],
})
export class UpdateCategorieComponent implements OnInit {
  currentCategorie: Categorie = new Categorie();

  constructor(
    private route: ActivatedRoute,
    private categorieService: CategorieService,
    private router: Router,
    private authService :AuthService
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.categorieService.getCategorieById(id).subscribe(
      (categorie) => {
        this.currentCategorie = categorie;
      },
      (error) => {
        console.error('Erreur lors de la récupération de la catégorie', error);
      }
    );
  }

  // Mettre à jour la catégorie
  updateCategorie(): void {
    this.categorieService.updateCategorie(this.currentCategorie.idCategorie, this.currentCategorie).subscribe(
      () => {
        Swal.fire('Succès !', 'La catégorie a été mise à jour.', 'success');
        this.router.navigate(['/admin/list-categories']);
      },
      (error) => {
        Swal.fire('Erreur !', 'Une erreur est survenue lors de la mise à jour.', 'error');
      }
    );
  }

  logout(): void {
    this.authService.logout(); // Appeler la méthode de déconnexion du service
    this.router.navigate(['/admin/signin']); // Rediriger vers la page de connexion admin
  }
}