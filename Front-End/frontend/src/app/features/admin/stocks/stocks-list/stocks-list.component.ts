import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BassinService } from '../../../../core/services/bassin.service';
import { Bassin } from '../../../../core/models/bassin.models';
import { MatDialog } from '@angular/material/dialog';
import { StockActionDialogComponent } from '../stock-action-dialog/stock-action-dialog.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { trigger, transition, style, animate } from '@angular/animations';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-stocks-list',
  templateUrl: './stocks-list.component.html',
  styleUrls: ['./stocks-list.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.5s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class StocksListComponent implements OnInit {
  bassins: Bassin[] = [];
  filteredBassins: Bassin[] = [];
  searchQuery: string = '';
  statusFilter: string = 'all';
  categoryFilter: number | null = null;
  categories: any[] = [];
  showArchived: boolean = false;

  constructor(
    private bassinService: BassinService,
    private router: Router,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadBassins();
    this.loadCategories();
  }

  loadBassins(): void {
    if (this.showArchived) {
      this.bassinService.getBassinsArchives().subscribe((data) => {
        this.bassins = data;
        this.applyFilters();
      });
    } else {
      this.bassinService.getBassinsNonArchives().subscribe((data) => {
        this.bassins = data;
        this.applyFilters();
      });
    }
  }

  loadCategories(): void {
    this.bassinService.getAllCategories().subscribe((data) => {
      this.categories = data;
    });
  }

  toggleArchivedView(): void {
    this.showArchived = !this.showArchived;
    this.loadBassins();
  }

  applyFilters(): void {
    this.filteredBassins = this.bassins.filter(bassin => {
      const searchMatch = this.searchQuery ?
        bassin.nomBassin.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        bassin.description.toLowerCase().includes(this.searchQuery.toLowerCase()) :
        true;

      let statusMatch = true;
      if (this.statusFilter === 'low') {
        statusMatch = bassin.stock < 5;
      } else if (this.statusFilter === 'available') {
        statusMatch = bassin.stock >= 5;
      }

      const categoryMatch = this.categoryFilter ?
        bassin.categorie.idCategorie === this.categoryFilter :
        true;

      return searchMatch && statusMatch && categoryMatch;
    });
  }

  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  onStatusFilterChange(filter: string): void {
    this.statusFilter = filter;
    this.applyFilters();
  }

  onCategoryFilterChange(categoryId: number | null): void {
    this.categoryFilter = categoryId;
    this.applyFilters();
  }

  viewDetails(id: number): void {
    this.router.navigate(['/admin/details-bassin/', id]);
  }

  openStockActionDialog(bassin: Bassin, action: 'ajuster' | 'archiver' | 'desarchiver'): void {
    if (!bassin.idBassin) {
      console.error('Bassin ID is undefined');
      return;
    }
  
    // Get viewport width to set dialog width responsively
    const viewportWidth = window.innerWidth;
    let dialogWidth: string;
    
    if (viewportWidth < 480) {
      dialogWidth = '95%'; // Mobile
    } else if (viewportWidth < 768) {
      dialogWidth = '80%'; // Tablet
    } else {
      dialogWidth = '500px'; // Desktop
    }
  
    const dialogRef = this.dialog.open(StockActionDialogComponent, {
      width: dialogWidth,
      maxWidth: '100vw',
      height: viewportWidth < 480 ? '100%' : 'auto',
      panelClass: viewportWidth < 480 ? 'full-screen-dialog' : '',
      data: { bassin, action }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (action === 'ajuster') {
          this.mettreAJourQuantite(bassin.idBassin, result.quantite, result.raison);
        } else if (action === 'archiver') {
          this.archiverBassin(bassin.idBassin);
        } else if (action === 'desarchiver') {
          this.desarchiverBassin(bassin.idBassin, result.nouvelleQuantite);
        }
      }
    });
  }

  archiverBassin(id: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: 'Vous ne pourrez pas revenir en arrière!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, archiver!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bassinService.archiverBassin(id).subscribe(() => {
          Swal.fire('Archivé!', 'Le bassin a été archivé.', 'success');
          this.loadBassins();
        });
      }
    });
  }

  desarchiverBassin(id: number, nouvelleQuantite: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: 'Vous êtes sur le point de désarchiver ce bassin.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, désarchiver!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bassinService.desarchiverBassin(id, nouvelleQuantite).subscribe(() => {
          Swal.fire('Désarchivé!', 'Le bassin a été désarchivé.', 'success');
          this.loadBassins();
        });
      }
    });
  }

  mettreAJourQuantite(id: number, quantite: number, raison: string): void {
    if (quantite === 0) {
      Swal.fire('Erreur', 'La quantité ne peut pas être zéro.', 'error');
      return;
    }

    this.bassinService.mettreAJourQuantite(id, quantite, raison).subscribe(
      () => {
        Swal.fire('Succès', 'Le stock a été mis à jour avec succès.', 'success');
        this.loadBassins();
      },
      (error) => {
        Swal.fire('Erreur', 'Une erreur est survenue lors de la mise à jour du stock.', 'error');
      }
    );
  }

  exportStockReport(): void {
    this.bassinService.generateStockReport().subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rapport-stock-' + new Date().toISOString().split('T')[0] + '.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  resetFilters(): void {
    this.searchQuery = ''; // Reset search query
    this.statusFilter = 'all'; // Reset status filter
    this.categoryFilter = null; // Reset category filter
    this.applyFilters(); // Reapply filters to refresh the list
  }
}