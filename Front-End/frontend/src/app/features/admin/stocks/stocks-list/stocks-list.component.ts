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

    const dialogRef = this.dialog.open(StockActionDialogComponent, {
      width: '500px',
      data: { bassin, action }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (action === 'ajuster') {
          this.mettreAJourQuantite(bassin.idBassin, result.quantite, result.raison);
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

openAdjustDialogForArchive(bassin: Bassin): void {
  const dialogRef = this.dialog.open(StockActionDialogComponent, {
    width: '500px',
    data: { 
      bassin: bassin, 
      action: 'ajuster',
      presetValues: {
        quantite: 0,
        raison: 'Ajustement pour archivage'
      }
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.mettreAJourQuantite(bassin.idBassin, 0, result.raison, true);
    }
  });
}

confirmArchive(bassin: Bassin): void {
  Swal.fire({
    title: 'Confirmer l\'archivage',
    html: `Êtes-vous sûr de vouloir archiver le bassin <strong>${bassin.nomBassin}</strong> ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, archiver',
    cancelButtonText: 'Annuler'
  }).then((result) => {
    if (result.isConfirmed) {
      this.archiverBassin(bassin.idBassin);
    }
  });
}
// Modifiez la méthode loadBassins pour charger automatiquement les bassins non archivés
loadBassins(): void {
  if (this.showArchived) {
    this.bassinService.getBassinsArchives().subscribe((data) => {
      this.bassins = data.map(bassin => {
        // Forcer la mise à jour du statut selon le stock
        bassin.statut = bassin.stock === 0 ? 'SUR_COMMANDE' : 'DISPONIBLE';
        return bassin;
      });
      this.applyFilters();
    });
  } else {
    this.bassinService.getBassinsNonArchives().subscribe((data) => {
      this.bassins = data.map(bassin => {
        // Forcer la mise à jour du statut selon le stock
        bassin.statut = bassin.stock === 0 ? 'SUR_COMMANDE' : 'DISPONIBLE';
        return bassin;
      });
      
      // Notification pour les bassins avec stock 0 non archivés
      const unarchivedZeroStock = this.bassins.filter(b => b.stock === 0 && !b.archive);
      if (unarchivedZeroStock.length > 0) {
        this.notificationService.showWarning(
          `${unarchivedZeroStock.length} bassin(s) avec stock à 0 non archivé(s)`,
          5000
        );
      }
      this.applyFilters();
    });
  }
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

  mettreAJourQuantite(id: number, quantite: number, raison: string, autoArchive: boolean = false): void {
    this.bassinService.mettreAJourQuantite(id, quantite, raison).subscribe(
      () => {
        if (autoArchive && quantite === 0) {
          const bassinToArchive = this.bassins.find(b => b.idBassin === id);
          if (bassinToArchive) {
            this.confirmArchive(bassinToArchive);
          } else {
            Swal.fire('Erreur', 'Bassin non trouvé pour archivage.', 'error');
            this.loadBassins();
          }
        } else {
          Swal.fire('Succès', 'Le stock a été mis à jour avec succès.', 'success');
          this.loadBassins();
        }
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
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.categoryFilter = null;
    this.applyFilters();
  }

  // Modifiez la méthode handleArchiveAction
  handleArchiveAction(bassin: Bassin): void {
    if (bassin.stock !== 0) {
        Swal.fire({
            title: 'Archivage impossible',
            html: `Le bassin <strong>${bassin.nomBassin}</strong> ne peut pas être archivé car son stock est à ${bassin.stock}.<br><br>
                   Seuls les bassins avec stock à 0 peuvent être archivés.`,
            icon: 'warning',
            confirmButtonText: 'Compris'
        });
        return;
    }

    Swal.fire({
        title: 'Confirmer l\'archivage',
        html: `Êtes-vous sûr de vouloir archiver le bassin <strong>${bassin.nomBassin}</strong> ?<br><br>
               Cela marquera le bassin comme "Rupture de stock définitive".`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, archiver',
        cancelButtonText: 'Annuler'
    }).then((result) => {
        if (result.isConfirmed) {
            this.bassinService.archiverBassin(bassin.idBassin).subscribe({
                next: () => {
                    Swal.fire('Archivé!', 'Le bassin a été marqué comme rupture de stock définitive', 'success');
                    this.loadBassins();
                },
                error: (err) => {
                    Swal.fire('Erreur', err.error || 'Erreur lors de l\'archivage', 'error');
                }
            });
        }
    });
}

// Ajoutez cette méthode pour ajuster la quantité à 0 puis proposer l'archivage
ajusterQuantiteVerZero(bassin: Bassin): void {
  Swal.fire({
    title: 'Mettre le stock à zéro',
    html: `Pour archiver le bassin <strong>${bassin.nomBassin}</strong>, son stock doit être à 0.<br>Voulez-vous mettre le stock à 0 maintenant?`,
    showCancelButton: true,
    confirmButtonText: 'Oui, mettre à 0',
    cancelButtonText: 'Annuler'
  }).then((result) => {
    if (result.isConfirmed) {
      this.bassinService.mettreAJourQuantite(bassin.idBassin, 0, 'Mise à 0 pour archivage potentiel').subscribe({
        next: () => {
          Swal.fire({
            title: 'Stock mis à jour',
            text: 'Le stock a été mis à 0. Voulez-vous archiver ce bassin maintenant?',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Oui, archiver',
            denyButtonText: 'Non, mettre sur commande',
            cancelButtonText: 'Plus tard'
          }).then((actionResult) => {
            if (actionResult.isConfirmed) {
              this.archiverBassin(bassin.idBassin);
            } else if (actionResult.isDenied) {
              this.bassinService.updateBassinStatus(bassin.idBassin, 'SUR_COMMANDE').subscribe(() => {
                Swal.fire('Sur commande', 'Le bassin a été marqué comme "Sur commande"', 'info');
                this.loadBassins();
              });
            } else {
              this.loadBassins();
            }
          });
        },
        error: () => {
          Swal.fire('Erreur', 'Erreur lors de la mise à jour du stock.', 'error');
        }
      });
    }
  });
}
updateFabricationDuration(bassin: Bassin): void {
  if (bassin.statut !== 'SUR_COMMANDE' || bassin.archive) {
    Swal.fire('Action non autorisée', 'La durée ne peut être modifiée que pour les bassins sur commande non archivés', 'error');
    return;
  }

  Swal.fire({
    title: 'Modifier la durée de fabrication',
    html: `
      <div class="swal-custom-container">
        <div class="bassin-info">
          <h4>${bassin.nomBassin}</h4>
          <p>Durée actuelle: ${bassin.dureeFabricationDisplay}</p>
        </div>
        
        <div class="duration-options">
          <div class="form-group">
            <label for="duration-type">Type de durée:</label>
            <select id="duration-type" class="form-control">
              <option value="single">Durée fixe</option>
              <option value="range">Fourchette de durée</option>
            </select>
          </div>
          
          <div id="single-duration" class="duration-input">
            <label>Durée (jours)</label>
            <input id="swal-input1" type="number" min="1" class="form-control" 
                   placeholder="Ex: 5" value="${bassin.dureeFabricationJours || bassin.dureeFabricationJoursMin || 5}">
          </div>
          
          <div id="range-duration" class="duration-input" style="display:none">
            <div class="row">
              <div class="col-md-6">
                <label>Durée min (jours)</label>
                <input id="swal-input-min" type="number" min="1" class="form-control" 
                       placeholder="Ex: 3" value="${bassin.dureeFabricationJoursMin || 3}">
              </div>
              <div class="col-md-6">
                <label>Durée max (jours)</label>
                <input id="swal-input-max" type="number" min="1" class="form-control" 
                       placeholder="Ex: 15" value="${bassin.dureeFabricationJoursMax || 15}">
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Mettre à jour',
    cancelButtonText: 'Annuler',
    didOpen: () => {
      const durationType = document.getElementById('duration-type') as HTMLSelectElement;
      const singleDiv = document.getElementById('single-duration') as HTMLDivElement;
      const rangeDiv = document.getElementById('range-duration') as HTMLDivElement;

      durationType.addEventListener('change', () => {
        if (durationType.value === 'single') {
          singleDiv.style.display = 'block';
          rangeDiv.style.display = 'none';
        } else {
          singleDiv.style.display = 'none';
          rangeDiv.style.display = 'block';
        }
      });

      // Initialisation selon la durée actuelle
      if (bassin.dureeFabricationJoursMin !== bassin.dureeFabricationJoursMax) {
        durationType.value = 'range';
        singleDiv.style.display = 'none';
        rangeDiv.style.display = 'block';
      }
    },
    preConfirm: () => {
      const durationType = (document.getElementById('duration-type') as HTMLSelectElement).value;
      
      if (durationType === 'single') {
        const days = parseInt((document.getElementById('swal-input1') as HTMLInputElement).value);
        if (!days || days <= 0) {
          Swal.showValidationMessage('La durée doit être un nombre positif');
          return null;
        }
        return { min: days, max: days };
      } else {
        const min = parseInt((document.getElementById('swal-input-min') as HTMLInputElement).value);
        const max = parseInt((document.getElementById('swal-input-max') as HTMLInputElement).value);
        
        if (!min || !max || min <= 0 || max <= 0 || min > max) {
          Swal.showValidationMessage('La fourchette doit être valide (min ≤ max)');
          return null;
        }
        return { min, max };
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      if (result.value.min === result.value.max) {
        this.bassinService.updateDureeFabrication(bassin.idBassin, result.value.min)
          .subscribe({
            next: () => {
              Swal.fire('Succès', `Durée de fabrication mise à jour: ${result.value.min} jours`, 'success');
              this.loadBassins();
            },
            error: (err) => {
              Swal.fire('Erreur', err.error || 'Une erreur est survenue', 'error');
            }
          });
      } else {
        this.bassinService.updateDureeFabrication(bassin.idBassin, result.value.min, result.value.max)
          .subscribe({
            next: () => {
              Swal.fire('Succès', `Durée de fabrication mise à jour: Entre ${result.value.min} et ${result.value.max} jours`, 'success');
              this.loadBassins();
            },
            error: (err) => {
              Swal.fire('Erreur', err.error || 'Une erreur est survenue', 'error');
            }
          });
      }
    }
  });
}
openStockAdjustDialog(bassin: Bassin): void {
  const dialogRef = this.dialog.open(StockActionDialogComponent, {
      width: '500px',
      data: { 
          bassin, 
          action: 'ajuster',
          allowNegative: false // Empêcher les quantités négatives
      }
  });

  dialogRef.afterClosed().subscribe(result => {
      if (result) {
          // Si le nouveau stock sera 0, demander la durée de fabrication
          const newStock = bassin.stock + result.quantite;
          
          if (newStock === 0) {
              this.openSetOnCommandDialog(bassin, result.quantite, result.raison);
          } else {
              this.mettreAJourQuantite(bassin.idBassin, result.quantite, result.raison);
          }
      }
  });
}

openSetOnCommandDialog(bassin: Bassin, quantite: number, raison: string): void {
  Swal.fire({
      title: 'Mettre sur commande',
      html: `Le stock de <strong>${bassin.nomBassin}</strong> sera à 0.<br>Veuillez définir la durée de fabrication:`,
      input: 'number',
      inputLabel: 'Durée en jours',
      inputPlaceholder: 'Ex: 15 pour 15 jours',
      inputValue: 7, // Valeur par défaut
      showCancelButton: true,
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      inputValidator: (value) => {
          if (!value || parseInt(value) <= 0) {
              return 'La durée doit être un nombre positif de jours';
          }
          return null;
      }
  }).then((result) => {
      if (result.isConfirmed) {
          const dureeJours = parseInt(result.value);
          
          // D'abord mettre à jour la quantité
          this.bassinService.mettreAJourQuantite(bassin.idBassin, quantite, raison).subscribe({
              next: () => {
                  // Ensuite mettre sur commande
                  this.bassinService.mettreSurCommande(bassin.idBassin, dureeJours).subscribe({
                      next: () => {
                          Swal.fire('Succès', 'Le bassin a été mis sur commande', 'success');
                          this.loadBassins();
                      },
                      error: (err) => {
                          Swal.fire('Erreur', err.error || 'Erreur lors de la mise sur commande', 'error');
                      }
                  });
              },
              error: (err) => {
                  Swal.fire('Erreur', err.error || 'Erreur lors de la mise à jour du stock', 'error');
              }
          });
      }
  });
}
}