import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, interval, takeUntil } from 'rxjs';
import { PanierItem } from '../../../core/models/panier-item.model';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { Bassin } from '../../../core/models/bassin.models';
import { AuthService } from '../../../core/authentication/auth.service';
import { BassinService } from '../../../core/services/bassin.service';
import { isPlatformBrowser } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: PanierItem[] = [];
  subtotal: number = 0;
  vatRate: number = 0.18; // 18% TVA
  vatAmount: number = 0;
  total: number = 0;
  isLoading: boolean = true;
  errorMessage: string = '';
  discount: number = 0;
  isBrowser: boolean = false;
  
  private cartSubscription!: Subscription;
  private promotionCheckInterval!: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private toastService: ToastService,
    private router: Router, private cdr: ChangeDetectorRef,
    public authService: AuthService,
    private bassinService: BassinService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.cartService.forceRefreshCart().subscribe({
        next: (cart) => console.log('Panier rafraîchi:', cart),
        error: (err) => console.error('Erreur lors du rafraîchissement du panier:', err)
      });
      
      this.loadCart();
      this.setupPromotionCheck(); // Now this method exists
    }
  }
 
 
  private setupPromotionCheck(): void {
    if (this.isBrowser) {
      // Check every minute (like shop page)
      this.promotionCheckInterval = interval(60000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.checkPromotionsUpdates();
          this.cdr.markForCheck();
        });
  
      // Also check when tab becomes visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkPromotionsUpdates();
        }
      });
    }
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
    
    if (this.promotionCheckInterval) {
      this.promotionCheckInterval.unsubscribe();
    }
  }



 // Vérification optimisée des mises à jour de promotion
 checkPromotionsUpdates(): void {
  if (this.cartItems.length === 0 || !this.isBrowser) return;

  const wasLoading = this.isLoading;
  this.isLoading = false;

  this.bassinService.listeBassinsAvecPromotions().subscribe({
    next: (updatedBassins) => {
      let needsUpdate = false;
      
      this.cartItems.forEach(item => {
        if (item.bassinId) {
          const updatedBassin = updatedBassins.find(b => b.idBassin === item.bassinId);
          if (updatedBassin) {
            const oldPrice = this.getEffectivePrice(item);
            
            // Use the same promotion logic as shop page
            const now = new Date();
            const startDate = new Date(updatedBassin.promotion?.dateDebut || '');
            const endDate = new Date(updatedBassin.promotion?.dateFin || '');
            
            const isPromoActive = updatedBassin.promotion && 
                                 now >= startDate && 
                                 now <= endDate;
            
           // Update item properties like in shop page
if (isPromoActive) {
  item.promotionActive = true;
  item.tauxReduction = updatedBassin.promotion?.tauxReduction || 0;
  item.prixOriginal = updatedBassin.prix;
  item.prixPromo = parseFloat((updatedBassin.prix * (1 - item.tauxReduction)).toFixed(2));
} else {
  item.promotionActive = false;
  item.prixPromo = updatedBassin.prix;
  item.tauxReduction = 0;
}
            
            if (oldPrice !== this.getEffectivePrice(item)) {
              needsUpdate = true;
            }
          }
        }
      });
      
      if (needsUpdate) {
        this.calculateTotals();
        this.toastService.showInfo('Promotions mises à jour', 2000);
        this.cdr.markForCheck();
      }
    },
    error: (err) => {
      console.error('Erreur vérification promotions:', err);
      this.isLoading = wasLoading;
      this.cdr.markForCheck();
    }
  });
}


  loadCart(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.cartSubscription = this.cartService.getCartItems().subscribe({
      next: (items: PanierItem[]) => {
        // Chargement en parallèle des détails des bassins
        const loadPromises = items.map(item => {
          return new Promise<void>(resolve => {
            if (!item.bassin && item.bassinId) {
              this.bassinService.consulterBassin(item.bassinId).subscribe({
                next: (bassin) => {
                  item.bassin = bassin;
                  this.updatePromotionStatus(item);
                  resolve();
                },
                error: () => resolve()
              });
            } else {
              this.updatePromotionStatus(item);
              resolve();
            }
          });
        });
  
        Promise.all(loadPromises).then(() => {
          this.cartItems = items;
          this.calculateTotals();
          this.isLoading = false;
          
          // Vérifier immédiatement les promotions après chargement
          this.checkPromotionsUpdates();
        });
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.errorMessage = 'Impossible de charger votre panier. Veuillez réessayer.';
        this.isLoading = false;
      }
    });
  }
  
  private loadBassinDetails(item: PanierItem): void {
    if (item.bassinId && !item.bassin) {
      this.bassinService.consulterBassin(item.bassinId).subscribe({
        next: (bassin) => {
          item.bassin = bassin;
          // Vérifier immédiatement le statut de la promotion
          this.updatePromotionStatus(item);
          this.calculateTotals();
        },
        error: (err) => console.error('Failed to load bassin details', err)
      });
    }
  }

// Mettre à jour le statut de promotion

private updatePromotionStatus(item: PanierItem): void {
  if (!item.bassin?.promotion) {
    item.promotionActive = false;
    item.prixPromo = item.bassin?.prix || 0;
    item.tauxReduction = 0;
    return;
  }

  const now = new Date();
  const startDate = new Date(item.bassin.promotion.dateDebut);
  const endDate = new Date(item.bassin.promotion.dateFin);
  
  const wasPromoActive = item.promotionActive;
  item.promotionActive = now >= startDate && now <= endDate;
  
  item.prixOriginal = item.bassin.prix || 0;
  
  // CORRECTION ICI: Ne pas diviser par 100 car le taux est déjà en décimal (0.35)
  item.tauxReduction = item.bassin.promotion.tauxReduction || 0;

  if (item.promotionActive) {
    // Calcul précis du prix promo avec arrondi
    item.prixPromo = parseFloat((item.prixOriginal * (1 - item.tauxReduction)).toFixed(2));
    
    console.log('Promotion appliquée:', {
      name: item.bassin.nomBassin,
      original: item.prixOriginal,
      reduction: `${item.tauxReduction * 100}%`,
      final: item.prixPromo,
      start: startDate,
      end: endDate
    });
  } else {
    item.prixPromo = item.prixOriginal;
  }
  
  if (wasPromoActive !== item.promotionActive) {
    this.calculateTotals();
  }
}

// Méthode pour forcer la vérification des promotions
forceCheckPromotions(): void {
  if (this.isBrowser) {
    this.checkPromotionsUpdates();
  }
}
  calculateTotals(): void {
    this.subtotal = this.cartItems.reduce((total, item) => 
      total + this.calculateSubtotal(item), 0);
    
    // Calculate discount if any items have promotions
    this.discount = this.cartItems.reduce((total, item) => {
      if (item.promotionActive && item.prixOriginal) {
        const originalPrice = item.prixOriginal * item.quantity;
        const currentPrice = this.getEffectivePrice(item) * item.quantity;
        return total + (originalPrice - currentPrice);
      }
      return total;
    }, 0);
    
    this.vatAmount = this.subtotal * this.vatRate;
    this.total = this.subtotal + this.vatAmount;
  }
  
  // Méthode pour obtenir le prix effectif
  getEffectivePrice(item: PanierItem): number {
    // Pour les produits personnalisés
    if (item.isCustomized && item.customProperties?.prixEstime) {
      return item.customProperties.prixEstime;
    }
    
    // Pour les produits en promotion
    if (item.promotionActive && item.tauxReduction !== undefined) {
      return item.prixPromo ?? (item.prixOriginal ?? item.bassin?.prix ?? 0) * (1 - item.tauxReduction);
    }
    
    // Prix standard
    return item.prixOriginal ?? item.bassin?.prix ?? 0;
  }

  // Affichage des détails
  getDisplayDetails(item: PanierItem): string {
    const details = [];
    
    // Produits personnalisés
    if (item.isCustomized && item.customProperties) {
      if (item.customProperties.dimensionSelectionnee) {
        details.push(item.customProperties.dimensionSelectionnee);
      }
      if (item.customProperties.couleurSelectionnee) {
        details.push(item.customProperties.couleurSelectionnee);
      }
      if (item.customProperties.materiauSelectionne) {
        details.push(item.customProperties.materiauSelectionne);
      }
    } 
    // Produits standards
    else if (item.bassin) {
      if (item.bassin.dimensions) {
        details.push(this.formatDimensions(item.bassin.dimensions));
      }
      if (item.bassin.couleur) {
        details.push(item.bassin.couleur);
      }
      if (item.bassin.materiau) {
        details.push(this.formatMateriaux(item.bassin.materiau));
      }
    }
    
    return details.join(' • ') || 'Bassin standard';
  }
  
  calculateSubtotal(item: PanierItem): number {
    return this.getEffectivePrice(item) * item.quantity;
  }

  getDiscountPercentage(item: PanierItem): number {
    if (!item.promotionActive || item.tauxReduction === undefined) {
      return 0;
    }
    // Multiplier par 100 pour convertir en pourcentage (0.35 → 35)
    return Math.round(item.tauxReduction * 100);
  }

  getDisplayDimensions(item: PanierItem): string {
    const dimensions = item.dimensions || item.bassin?.dimensions;
    if (!dimensions) return 'Dimensions non spécifiées';
    return Array.isArray(dimensions) ? dimensions.join(' x ') : dimensions;
  }

  getDisplayMateriaux(item: PanierItem): string {
    const materiau = item.materiau || item.bassin?.materiau;
    if (!materiau) return 'Matériau non spécifié';
    return Array.isArray(materiau) ? materiau.join(', ') : materiau;
  }

  removeFromCart(item: PanierItem): void {
    if (!item.id) {
      this.toastService.showError('Impossible de supprimer cet article');
      return;
    }
  
    Swal.fire({
      title: 'Confirmer la suppression',
      text: 'Êtes-vous sûr de vouloir retirer cet article de votre panier?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cartService.removeFromCart(item.id).subscribe({
          next: () => {
            this.toastService.showSuccess('Article supprimé du panier');
            this.loadCart();
          },
          error: (error: any) => {
            console.error('Error removing item:', error);
            this.toastService.showError('Erreur lors de la suppression de l\'article');
          }
        });
      }
    });
  }
  
  clearCart(): void {
    Swal.fire({
      title: 'Vider le panier',
      text: 'Êtes-vous sûr de vouloir supprimer tous les articles de votre panier ? Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, vider le panier',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      backdrop: `
        rgba(0,0,0,0.4)
        url("/assets/images/empty-cart.gif")
        left top
        no-repeat
      `
    }).then((result) => {
      if (result.isConfirmed) {
        this.cartService.clearCart().subscribe({
          next: () => {
            Swal.fire({
              title: 'Panier vidé !',
              text: 'Tous les articles ont été supprimés de votre panier.',
              icon: 'success',
              timer: 2000,
              timerProgressBar: true,
              showConfirmButton: false
            });
            this.loadCart();
          },
          error: (error: any) => {
            console.error('Error clearing cart:', error);
            Swal.fire({
              title: 'Erreur',
              text: 'Une erreur est survenue lors de la suppression des articles. Veuillez réessayer.',
              icon: 'error',
              confirmButtonText: 'OK'
            });
          }
        });
      }
    });
  }
  
  goToShop(): void {
    this.router.navigate(['/shop']);
  }

  proceedToCheckout(): void {
    if (this.cartItems.length === 0) {
      this.toastService.showError('Votre panier est vide');
      return;
    }
    
    if (!this.authService.isLoggedIn) {
      // Sauvegarder l'URL actuelle pour rediriger après connexion
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      this.toastService.showInfo('Veuillez vous connecter ou créer un compte pour finaliser votre commande');
    } else {
      this.router.navigate(['/checkout']);
    }
  }
  
  // Méthode pour gérer les erreurs d'images
  onImageError(event: any): void {
    event.target.src = 'assets/default-image.webp'; // Image par défaut
  }

  getImageUrl(item: PanierItem): string {
    if (!item) return 'assets/default-image.webp';
  
    // Image personnalisée
    if (item.isCustomized && item.customProperties?.imageUrl) {
      return item.customProperties.imageUrl;
    }
  
    // Image du bassin avec vérification complète
    if (item.bassin && item.bassin.imagesBassin && item.bassin.imagesBassin.length > 0) {
      const firstImage = item.bassin.imagesBassin[0];
      if (firstImage && firstImage.imagePath) {
        return `${this.bassinService.apiURL}/imagesBassin/getFS/${encodeURIComponent(firstImage.imagePath)}`;
      }
    }
  
    // Fallback
    return item.isCustomized ? 'assets/default-custom.webp' : 'assets/default-image.webp';
  }
  
  getItemName(item: PanierItem): string {
    if (item.nomBassin) return item.nomBassin;
    if (item.bassin?.nomBassin) return item.bassin.nomBassin;
    return item.isCustomized ? 'Bassin personnalisé' : 'Bassin standard';
  }

  formatDimensions(dimensions: string | string[]): string {
    if (!dimensions) return 'Non spécifié';
    if (Array.isArray(dimensions)) return dimensions.join(' × ') + ' cm';
    return dimensions;
  }

  formatMateriaux(materiau: string | string[]): string {
    if (!materiau) return 'Non spécifié';
    if (Array.isArray(materiau)) return materiau.join(', ');
    return materiau;
  }

  // Ajoutez cette méthode pour le temps restant
  getTimeLeft(endDateStr: string): string {
    const endDate = new Date(endDateStr);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'expirée';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}j ${hours}h ${minutes}m`;
  }

  async incrementQuantity(item: PanierItem): Promise<void> {
    try {
      // Pour les produits personnalisés, pas de limite de stock
      if (item.isCustomized) {
        await this.updateQuantity(item, item.quantity + 1);
        return;
      }

      // Vérification du stock
      if (!item.bassin || item.bassin.stock === undefined) {
        await Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de vérifier le stock pour ce produit',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6'
        });
        return;
      }

      if (item.bassin.stock <= 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Rupture de stock',
          text: 'Ce produit est actuellement en rupture de stock',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6'
        });
        return;
      }

      if (item.quantity >= item.bassin.stock) {
        await Swal.fire({
          icon: 'warning',
          title: 'Stock insuffisant',
          html: `Vous ne pouvez pas commander plus de <b>${item.bassin.stock}</b> unité(s) de ce produit`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6'
        });
        return;
      }

      await this.updateQuantity(item, item.quantity + 1);
      
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors de la mise à jour de la quantité',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6'
      });
    }
  }
  
  public async updateQuantity(item: PanierItem, newQuantity: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cartService.updateQuantity(item, newQuantity).subscribe({
        next: (updatedItem) => {
          item.quantity = newQuantity;
          this.calculateTotals();
          Swal.fire({
            icon: 'success',
            title: 'Quantité mise à jour',
            showConfirmButton: false,
            timer: 1500
          });
          resolve();
        },
        error: (err) => {
          console.error('Erreur:', err);
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Erreur lors de la mise à jour de la quantité',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6'
          });
          this.loadCart(); // Recharger les données
          reject(err);
        }
      });
    });
  }

  // Modifier decrementQuantity()
  decrementQuantity(item: PanierItem): void {
    const newQuantity = item.quantity - 1;
    
    if (newQuantity <= 0) {
      this.removeFromCart(item);
    } else {
      this.updateQuantity(item, newQuantity);
    }
  }

  // Simplifier showStockAlert()
  private showStockAlert(availableStock: number): void {
    if (availableStock === 0) {
      this.toastService.showWarning('Ce produit est en rupture de stock');
    } else {
      this.toastService.showWarning(`Vous ne pouvez pas commander plus de ${availableStock} unités`);
    }
  }

  // Vérifier manuellement les promotions
  refreshPromotions(): void {
    if (this.isBrowser) {
      this.checkPromotionsUpdates();
    }
  }

  logItemDetails(item: PanierItem): void {
    console.log('Item details:', {
      id: item.id,
      name: item.nomBassin || item.bassin?.nomBassin,
      isCustomized: item.isCustomized,
      bassin: item.bassin,
      customProperties: item.customProperties,
      imageUrl: this.getImageUrl(item)
    });
  }

  debugPromotions(): void {
    this.cartItems.forEach(item => {
      if (item.bassin?.promotion) {
        console.log('Détails promotion pour', item.bassin.nomBassin, ':');
        console.log('- Active:', item.promotionActive);
        console.log('- Taux:', item.tauxReduction);
        console.log('- Prix original:', item.prixOriginal);
        console.log('- Prix promo:', item.prixPromo);
        console.log('- Dates:', item.bassin.promotion.dateDebut, 'à', item.bassin.promotion.dateFin);
      }
    });
  }
}