import { Component, OnInit } from '@angular/core';
import { AvisService } from '../../../core/services/avis.service';
import Swal from 'sweetalert2';
import { Avis } from '../../../core/models/avis.models';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-avis',
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.css']
})
export class AvisComponent implements OnInit {
  avisList: Avis[] = []; // Liste des avis
  filteredAvis: Avis[] = []; // Avis filtrés
  searchQuery: string = ''; // Requête de recherche
  selectedRating: string = ''; // Note sélectionnée
  isLoading: boolean = true; // Indicateur de chargement

  constructor(
    private avisService: AvisService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadAvis(); // Charge la liste des avis
  }

  // Charge la liste des avis
  loadAvis(): void {
    this.isLoading = true;
    this.avisService.getAllAvis().subscribe({
      next: (avis) => {
        this.avisList = avis;
        this.filteredAvis = avis;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des avis:', error);
        this.isLoading = false;
        Swal.fire('Erreur', 'Impossible de charger les avis', 'error');
      }
    });
  }

  // Gère la recherche dynamique
  onSearchInput(): void {
    this.filterAvis();
  }

// Filtre les avis
filterAvis(): void {
  this.filteredAvis = this.avisList.filter(avis => {
    // Filtre par note
    const matchesRating = this.selectedRating === '' || avis.note === +this.selectedRating;

    // Filtre par recherche (nom ou message)
    const matchesSearch = this.searchQuery === '' ||
      avis.nom?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      avis.message.toLowerCase().includes(this.searchQuery.toLowerCase());

    // Applique les deux filtres
    return matchesRating && matchesSearch;
  });
}

  // Réinitialise les filtres
  resetFilters(): void {
    this.searchQuery = '';
    this.selectedRating = '';
    this.filteredAvis = this.avisList;
  }

  // Affiche les détails d'un avis
  viewAvisDetails(avis: Avis): void {
    Swal.fire({
      title: 'Détails de l\'avis',
      html: `
        <p><strong>Auteur:</strong> ${avis.nom || 'Anonyme'}</p>
        <p><strong>Date:</strong> ${new Date(avis.dateSoumission).toLocaleDateString()}</p>
        <p><strong>Note:</strong> ${avis.note}/5</p>
        <p><strong>Commentaire:</strong></p>
        <p>${avis.message}</p>
        <p><strong>Bassin:</strong> ${avis.bassin?.nomBassin || 'Non spécifié'}</p>
      `,
      icon: 'info',
      confirmButtonText: 'Fermer'
    });
  }

  // Supprime un avis
  deleteAvis(idAvis: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: 'Cette action est irréversible!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.avisService.deleteAvis(idAvis).subscribe({
          next: () => {
            this.loadAvis();
            Swal.fire('Supprimé!', 'L\'avis a été supprimé avec succès.', 'success');
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
            Swal.fire('Erreur', error.error?.message || 'Impossible de supprimer l\'avis', 'error');
          }
        });
      }
    });
  }
}