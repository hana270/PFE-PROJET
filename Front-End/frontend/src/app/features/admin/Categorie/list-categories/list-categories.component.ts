import { AuthService } from './../../../../core/authentication/auth.service';
import { Component, OnInit } from '@angular/core';
import { CategorieService } from '../../../../core/services/categorie.service';
import { Categorie } from '../../../../core/models/categorie.models';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-list-categories',
  templateUrl: './list-categories.component.html',
  styleUrls: ['./list-categories.component.css'],
})
export class ListCategoriesComponent implements OnInit {
  categories: Categorie[] = [];

  constructor(private categorieService: CategorieService,
    private authService:AuthService,private router : Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  // Charger la liste des catégories
  loadCategories(): void {
    this.categorieService.getAllCategories().subscribe(
      (data) => {
        this.categories = data;
      },
      (error) => {
        console.error('Erreur lors du chargement des catégories', error);
      }
    );
  }

  // Supprimer une catégorie
  deleteCategorie(id: number): void {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.categorieService.deleteCategorie(id).subscribe(
          () => {
            Swal.fire('Deleted!', 'Your category has been deleted.', 'success');
            this.loadCategories(); // Refresh the list after successful deletion
          },
          (error) => {
            console.error("Error deleting category:", error);
            let errorMessage = 'Failed to delete category.';
            if (error.error && typeof error.error === 'string') {
              errorMessage = error.error; // Display backend error message if available
            } else if (error.error && error.error.message) {
              errorMessage = error.error.message;
            }
            Swal.fire('Error', errorMessage, 'error'); // Display specific error message
          }
        );
      }
    });
  }


logout(): void {
  this.authService.logout(); // Appeler la méthode de déconnexion du service
  this.router.navigate(['/admin/signin']); // Rediriger vers la page de connexion admin
}

}