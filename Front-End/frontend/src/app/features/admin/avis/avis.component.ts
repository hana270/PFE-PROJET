import { Component, OnInit } from '@angular/core';
import { AvisService } from '../../../core/services/avis.service';
import Swal from 'sweetalert2';
import { Avis } from '../../../core/models/avis.models';
import { AuthService } from '../../../core/authentication/auth.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-avis',
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.scss'],
  providers: [DatePipe]
})
export class AvisComponent implements OnInit {
  avisList: Avis[] = [];
  filteredAvis: Avis[] = [];
  searchQuery: string = '';
  selectedRating: string = '';
  isLoading: boolean = true;
  currentSort: { field: string, direction: 'asc' | 'desc' } = { field: 'dateSoumission', direction: 'desc' };

  constructor(
    private avisService: AvisService,
    private authService: AuthService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.loadAvis();
  }

  loadAvis(): void {
    this.isLoading = true;
    this.avisService.getAllAvis().subscribe({
      next: (avis) => {
        this.avisList = avis.map(a => ({
          ...a,
          showHistorique: false
        }));
        this.filteredAvis = [...this.avisList];
        this.sortAvis();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des avis:', error);
        this.isLoading = false;
        this.showErrorAlert('Erreur de chargement', 'Impossible de charger les avis');
      }
    });
  }

  filterAvis(): void {
    this.filteredAvis = this.avisList.filter(avis => {
      const matchesRating = !this.selectedRating || avis.note === +this.selectedRating;
      const matchesSearch = !this.searchQuery ||
        (avis.nom?.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        avis.message.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchesRating && matchesSearch;
    });
    this.sortAvis();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedRating = '';
    this.filterAvis();
  }


  sortAvis(field?: string): void {
    if (field) {
      if (this.currentSort.field === field) {
        this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        this.currentSort.field = field;
        this.currentSort.direction = 'asc';
      }
    }

    this.filteredAvis.sort((a, b) => {
      const valueA = this.getSortValue(a[this.currentSort.field as keyof Avis]);
      const valueB = this.getSortValue(b[this.currentSort.field as keyof Avis]);

      if (valueA < valueB) {
        return this.currentSort.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.currentSort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private getSortValue(value: any): any {
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === 'string' && !isNaN(Date.parse(value))) {
      return new Date(value).getTime();
    }
    return value;
  }

  private isDateString(value: any): boolean {
    return typeof value === 'string' && !isNaN(Date.parse(value));
  }

  toggleHistorique(avis: Avis): void {
    avis.showHistorique = !avis.showHistorique;
  }

  formatDate(dateString: string): string {
    return this.datePipe.transform(dateString, 'medium') || '';
  }

  truncateText(text: string, length: number = 50): string {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }

  viewAvisDetails(avis: Avis): void {
    Swal.fire({
      title: 'Détails de l\'avis',
      html: this.getAvisDetailsHtml(avis),
      icon: 'info',
      confirmButtonText: 'Fermer',
      width: '800px',
      customClass: {
        popup: 'swal2-popup-custom'
      }
    });
  }

  private getAvisDetailsHtml(avis: Avis): string {
    return `
      <div class="container-fluid">
        <div class="row mb-3">
          <div class="col-md-6">
            <h5>Informations de base</h5>
            <p><strong>Auteur:</strong> ${avis.nom || 'Anonyme'}</p>
            <p><strong>Date de soumission:</strong> ${this.formatDate(avis.dateSoumission)}</p>
            ${avis.dateModification ? `<p><strong>Dernière modification:</strong> ${this.formatDate(avis.dateModification)}</p>` : ''}
            <p><strong>Note:</strong> ${this.getStarsHtml(avis.note)}</p>
          </div>
          <div class="col-md-6">
            <h5>Bassin concerné</h5>
            <p><strong>Nom:</strong> ${avis.bassin?.nomBassin || 'Non spécifié'}</p>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <h5>Commentaire</h5>
            <div class="p-3 bg-light rounded">${avis.message}</div>
          </div>
        </div>
        ${avis.historiqueModifications?.length ? `
        <div class="row mt-3">
          <div class="col-12">
            <h5>Historique des modifications</h5>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ancien nom</th>
                    <th>Ancienne note</th>
                    <th>Ancien message</th>
                  </tr>
                </thead>
                <tbody>
                  ${avis.historiqueModifications.map(modif => `
                    <tr>
                      <td>${this.formatDate(modif.dateModification)}</td>
                      <td>${modif.ancienNom || 'Anonyme'}</td>
                      <td>${this.getStarsHtml(modif.ancienneNote)}</td>
                      <td>${modif.ancienMessage}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  private getStarsHtml(rating: number): string {
    return `
      <span class="star-rating">
        ${[1, 2, 3, 4, 5].map(star => `
          <i class="fas fa-star${star <= rating ? ' text-warning' : ' text-muted'}"></i>
        `).join('')}
      </span>
    `;
  }

  deleteAvis(idAvis: number): void {
    Swal.fire({
      title: 'Confirmation de suppression',
      text: 'Êtes-vous sûr de vouloir supprimer cet avis ? Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.avisService.deleteAvis(idAvis).subscribe({
          next: () => {
            this.showSuccessAlert('Avis supprimé', 'L\'avis a été supprimé avec succès.');
            this.loadAvis();
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
            this.showErrorAlert('Erreur', error.error?.message || 'Impossible de supprimer l\'avis');
          }
        });
      }
    });
  }

  private showSuccessAlert(title: string, text: string): void {
    Swal.fire({
      title,
      text,
      icon: 'success',
      timer: 3000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  private showErrorAlert(title: string, text: string): void {
    Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
}