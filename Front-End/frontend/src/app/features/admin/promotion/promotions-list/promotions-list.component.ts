import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { Promotion } from '../../../../core/models/promotion.model';
import { PromotionService } from '../../../../core/services/promotion.service';
import { DatePipe } from '@angular/common';
import Swal from 'sweetalert2';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-promotions-list',
  templateUrl: './promotions-list.component.html',
  styleUrls: ['./promotions-list.component.css'],
  animations: [
    trigger('fadeInHeader', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeInStats', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('sectionAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class PromotionsListComponent implements OnInit {
  promotions: Promotion[] = [];
  loading: boolean = true;
  error: string | null = null;
  searchTerm: string = '';
  currentDate: string = '';
  expiredSectionCollapsed: boolean = true;
  stockAlert: boolean = false;

  constructor(
    private promotionService: PromotionService,
    private router: Router,
    private datePipe: DatePipe,
    private cdRef: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {
    // Abonnez-vous aux notifications de mise à jour des promotions
    this.notificationService.promotionUpdate$.subscribe(() => {
      console.log('Notification reçue: rechargement des promotions');
      this.loadPromotions();
    });
  }

  ngOnInit(): void {
    // Charger les promotions et initialiser la date actuelle
    this.loadPromotions();
  }

  // Méthode pour charger les promotions et mettre à jour la date
loadPromotions(): void {
  this.loading = true;
  console.log('Chargement des promotions...');
  this.promotionService.getAllPromotions().subscribe({
    next: (data) => {
      console.log('Promotions reçues:', data);
      this.promotions = data || []; // Ensure it's never undefined
      this.currentDate = this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm') || '';
      this.checkStockAlerts();
      this.loading = false;
      this.cdRef.detectChanges(); // Force la mise à jour de la vue
    },
    error: (err) => {
      console.error('Error loading promotions', err);
      this.promotions = []; // Set to empty array on error
      this.error = 'Failed to load promotions';
      this.loading = false;
    }
  });
}
  ngAfterViewInit() {
    this.cdRef.detectChanges();
  }
  // Vérifier si des bassins en promotion ont un stock bas
  checkStockAlerts(): void {
    // Logique à implémenter pour vérifier si la quantité des bassins dépasse le stock
    // Cette méthode serait appelée après le chargement des promotions
    this.stockAlert = true; // À définir selon votre logique métier
  }

  // Méthode pour obtenir les informations de statut de la promotion
  private getPromotionStatus(promotion: Promotion): 'active' | 'upcoming' | 'expired' {
    const now = new Date();
    const dateDebut = new Date(promotion.dateDebut);
    const dateFin = new Date(promotion.dateFin);

    if (dateFin < now) {
      return 'expired';
    } else if (dateDebut > now) {
      return 'upcoming';
    } else {
      return 'active';
    }
  }

  deletePromotion(id: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Vous ne pourrez pas annuler cette action !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3f51b5',
      cancelButtonColor: '#e5383b',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (result.isConfirmed) {
        this.promotionService.deletePromotion(id).subscribe({
          next: () => {
            this.promotions = this.promotions.filter(p => p.idPromotion !== id);
            this.showSuccessToast('Promotion supprimée avec succès !');
          },
          error: (err) => {
            console.error('Erreur lors de la suppression', err);
            this.showErrorToast('Erreur lors de la suppression de la promotion.');
          },
        });
      }
    });
  }

  addNewPromotion(): void {
    this.router.navigate(['/admin/promotions/add']);
  }

  editPromotion(id: number): void {
    if (id !== undefined) {
      this.router.navigate(['/admin/promotions/edit', id]);
    } else {
      this.showErrorToast('ID de promotion non valide');
    }
  }

  applyPromotion(id: number): void {
    if (id !== undefined) {
      this.router.navigate(['/admin/promotions/apply', id]);
    } else {
      this.showErrorToast('ID de promotion non valide');
    }
  }

  viewBassinDetails(bassinId: number): void {
    this.router.navigate(['/admin/details-bassin', bassinId]);
  }

  viewCategorieDetails(categorieId: number): void {
    this.router.navigate(['/admin/categories/details', categorieId]);
  }

  get filteredPromotions(): Promotion[] {
    if (!this.searchTerm) return this.promotions;

    const term = this.searchTerm.toLowerCase();
    return this.promotions.filter(promotion => 
      promotion.nomPromotion.toLowerCase().includes(term) || 
      promotion.tauxReduction.toString().includes(term) ||
      (promotion.bassins && promotion.bassins.some(b => b.nomBassin.toLowerCase().includes(term))) ||
      (promotion.categories && promotion.categories.some(c => c.nomCategorie.toLowerCase().includes(term)))
    );
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return this.datePipe.transform(date, 'dd/MM/yyyy') || '';
  }

  formatReduction(reduction: number): string {
    return (reduction * 100).toFixed(0) + '%';
  }

  // Toast notifications
  private showSuccessToast(message: string): void {
    Swal.fire({
      icon: 'success',
      title: 'Succès !',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }

  private showErrorToast(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Erreur !',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }

  getPromotionsByStatus(status: 'active' | 'upcoming' | 'expired'): Promotion[] {
    const now = new Date();
    return this.filteredPromotions.filter(promotion => {
      const dateDebut = new Date(promotion.dateDebut);
      const dateFin = new Date(promotion.dateFin);
  
      switch (status) {
        case 'active':
          return dateDebut <= now && dateFin >= now; // Promotions actives
        case 'upcoming':
          return dateDebut > now; // Promotions à venir
        case 'expired':
          return dateFin < now; // Promotions expirées
        default:
          return false;
      }
    });
  }

  toggleExpiredSection(): void {
    this.expiredSectionCollapsed = !this.expiredSectionCollapsed;
  }

  reactivatePromotion(id: number): void {
    Swal.fire({
      title: 'Réactiver la promotion',
      text: 'Voulez-vous vraiment réactiver cette promotion ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2b9348',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, réactiver !',
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (result.isConfirmed) {
        // Logique pour réactiver la promotion
        const promotionToUpdate = this.promotions.find(p => p.idPromotion === id);
        if (promotionToUpdate) {
          // Calcul d'une nouvelle date de fin (par exemple, 30 jours à partir d'aujourd'hui)
          const today = new Date();
          const newEndDate = new Date(today);
          newEndDate.setDate(today.getDate() + 30);
          
          promotionToUpdate.dateDebut = today.toISOString().split('T')[0];
          promotionToUpdate.dateFin = newEndDate.toISOString().split('T')[0];
          
          this.promotionService.updatePromotion(id, promotionToUpdate).subscribe({
            next: () => {
              this.loadPromotions(); // Recharger les promotions pour mettre à jour l'interface
              this.showSuccessToast('Promotion réactivée avec succès !');
            },
            error: (err) => {
              console.error('Erreur lors de la réactivation de la promotion', err);
              this.showErrorToast('Erreur lors de la réactivation de la promotion.');
            }
          });
        }
      }
    });
  }
  
  archivePromotion(id: number): void {
    Swal.fire({
      title: 'Archiver la promotion',
      text: 'Voulez-vous vraiment archiver cette promotion ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f48c06',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, archiver !',
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (result.isConfirmed) {
        // Logique pour archiver la promotion
        // Ici, on pourrait appeler une API spécifique ou marquer la promotion comme archivée
        this.showSuccessToast('Promotion archivée avec succès !');
        // Supprimer temporairement de la liste (à adapter selon votre logique métier)
        this.promotions = this.promotions.filter(p => p.idPromotion !== id);
      }
    });
  }
}