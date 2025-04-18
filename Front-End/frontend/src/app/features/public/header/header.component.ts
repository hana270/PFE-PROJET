import { Component, HostListener, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { AuthService } from '../../../core/authentication/auth.service';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { ToastService } from '../../../core/services/toast.service';
import { catchError, distinctUntilChanged, finalize, interval, map, Observable, of, Subject, Subscription, switchMap, takeUntil, tap } from 'rxjs';
import { Bassin } from '../../../core/models/bassin.models';
import { BassinService } from '../../../core/services/bassin.service';
import { PanierItem } from '../../../core/models/panier-item.model';
import { Panier } from '../../../core/models/panier.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})

export class HeaderComponent implements OnInit, OnDestroy {
  isMenuOpen = false;
  isDropdownOpen = false;
  isCartOpen = false;
  isAuthenticated = false;
  isClient = false;
  cartItems: PanierItem[] = [];
  totalPrice = 0;
  favoritesCount = 0;

  private cartSubscription: Subscription | null = null;
  private authSubscription: Subscription | null = null;
  private favoritesSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cartService: CartService,
    private favoritesService: FavoritesService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private bassinService: BassinService,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.initializeAuthSubscription();
    this.initializeCartSubscription();
    this.loadInitialCartData();
    
    if (this.isBrowser) {
      // Vérifier les promotions toutes les minutes
      interval(60000).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.checkPromotions();
      });
    }
  }

  private initializeAuthSubscription(): void {
    this.authSubscription = this.authService.isLoggedIn$.pipe(
      distinctUntilChanged(),
      tap(isLoggedIn => {
        this.isAuthenticated = isLoggedIn;
        this.isClient = this.authService.isClient();
      }),
      switchMap(isLoggedIn => isLoggedIn 
        ? this.cartService.forceRefreshCart()
        : this.cartService.getServerCart()
      ),
      catchError(err => {
        console.error('Error loading cart:', err);
        return of(this.cartService.getLocalCart());
      })
    ).subscribe((panier: Panier) => {
      this.updateCartDisplay(panier);
    });
  }

  private initializeCartSubscription(): void {
    this.cartSubscription = this.cartService.panier$.pipe(
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev?.items) === JSON.stringify(curr?.items))
    ).subscribe(panier => {
      this.updateCartDisplay(panier);
      this.cdr.detectChanges();
    });
  }

  private loadInitialCartData(): void {
    const initialLoad$ = this.authService.isLoggedIn 
      ? this.cartService.forceRefreshCart()
      : this.cartService.getServerCart();

    initialLoad$.pipe(
      catchError(() => of(this.cartService.getLocalCart()))
    ).subscribe((panier: Panier) => {
      this.updateCartDisplay(panier);
    });
  }

 
  private calculateTotalPrice(items: PanierItem[]): number {
    return items.reduce((total, item) => {
      // Utiliser effectivePrice qui est déjà calculé correctement
      const price = item.effectivePrice || item.prixOriginal || 0;
      return total + (price * item.quantity);
    }, 0);
  }

  getDisplayDetails(item: PanierItem): string {
    if (!item) return 'Produit standard';
    
    const details = [];
    
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
      
      if (item.customProperties.accessoires && item.customProperties.accessoires.length > 0) {
        const accessoireNames = item.customProperties.accessoires
          .map(acc => acc.nomAccessoire)
          .join(', ');
        if (accessoireNames) {
          details.push(`Accessoires: ${accessoireNames}`);
        }
      }
      
      if (item.customProperties.dureeFabrication) {
        details.push(`Délai: ${item.customProperties.dureeFabrication}`);
      }
    } else {
      const dimensions = item.bassin?.dimensions ?? item.dimensions;
      if (dimensions) {
        details.push(
          Array.isArray(dimensions) 
            ? dimensions.filter(Boolean).join('x') + ' cm'
            : dimensions.includes('cm') ? dimensions : dimensions + ' cm'
        );
      }
      
      const couleur = item.bassin?.couleur ?? item.couleur;
      if (couleur) {
        details.push(couleur);
      }
      
      const materiau = item.bassin?.materiau ?? item.materiau;
      if (materiau) {
        details.push(
          Array.isArray(materiau) 
            ? materiau.filter(Boolean).join(', ')
            : materiau
        );
      }
    }
    
    return details.filter(Boolean).join(' • ') || 'Produit standard';
  }


// Pour obtenir le prix affiché
getDisplayPrice(item: PanierItem): string {
  const price = item.promotionActive && item.effectivePrice 
    ? item.effectivePrice 
    : item.prixOriginal;
    
  return price?.toFixed(2) + ' TND';
}
// Pour obtenir le taux de réduction
getReductionPercentage(item: PanierItem): string {
  if (!item.promotionActive || item.tauxReduction === undefined) return '';
  
  // Convertir 0.65 en 65% sans arrondir pour garder la valeur exacte
  const percentage = item.tauxReduction * 100;
  return `-${percentage.toFixed(0)}%`;
}

/**************** */



// Remplacer getCartItemCount par :
get cartItemCount(): number {
  // Retourne le nombre de produits différents dans le panier, pas la somme des quantités
  return this.cartItems.length;
}
getSafeStock(item: PanierItem): number | null {
  return item.bassin?.stock ?? null;
}

private cleanImagePath(path: string): string {
  if (!path) return '';
  
  // Supprimer les parties inutiles du chemin
  const cleaned = path.replace(/^.*[\\\/]/, ''); // Supprime tout jusqu'au dernier / ou \
  
  // Supprimer les paramètres de requête s'il y en a
  return cleaned.split('?')[0];
}

handleImageError(event: any, item: any) {
  console.error('Erreur de chargement de l\'image:', event);
  if (item?.bassin) {
    event.target.src = 'assets/default-image.webp';
  } else if (item?.isCustomized) {
    event.target.src = 'assets/default-image.webp';
  } else {
    event.target.src = 'assets/default-image.webp';
  }
}


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.cartSubscription) this.cartSubscription.unsubscribe();
    if (this.authSubscription) this.authSubscription.unsubscribe();
    if (this.favoritesSubscription) this.favoritesSubscription.unsubscribe();
  }

// Amélioration de la méthode pour calculer le total du panier
getCartTotal(): number {
  return this.cartItems.reduce((total, item) => {
    let itemPrice = 0;
    
    // For customized items
    if (item.isCustomized && item.customProperties?.prixEstime) {
      itemPrice = item.customProperties.prixEstime;
      // Apply promotion if active
      if (item.promotionActive && item.tauxReduction) {
        itemPrice = itemPrice * (1 - (item.tauxReduction *100 / 100));
      }
    }
    // For standard items with promotion
    else if (item.promotionActive && item.tauxReduction) {
      itemPrice = (item.prixOriginal || 0) * (1 - (item.tauxReduction *100 / 100));
    }
    // Standard price
    else {
      itemPrice = item.prixOriginal || 0;
    }
    
    return total + (itemPrice * item.quantity);
  }, 0);
}


 
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleCart(event: Event): void {
    event.stopPropagation();
    this.isCartOpen = !this.isCartOpen;
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const dropdown = document.querySelector('.profile-dropdown');
    const button = document.querySelector('.profile-btn');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartBtn = document.querySelector('.cart-btn');

    if (dropdown && button && !dropdown.contains(event.target as Node) && !button.contains(event.target as Node)) {
      this.isDropdownOpen = false;
    }

    if (cartSidebar && cartBtn && !cartSidebar.contains(event.target as Node) && !cartBtn.contains(event.target as Node)) {
      this.isCartOpen = false;
    }
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

 

  getUniqueItemsCount(): number {
    return this.cartItems.length; // Retourne le nombre d'articles uniques, pas la quantité totale
  }

 
  decrementQuantity(item: PanierItem): void {
    this.updateQuantity(item, item.quantity - 1);
  }


  goToCart(): void {
    this.router.navigate(['/cart']);
    this.isCartOpen = false;
  }

  get uniqueItemsCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }


 
// Méthode améliorée pour afficher les détails du produit
getBassinDetails(item: PanierItem): string {
  if (!item) return 'Aucun détail disponible';
  
  const details = [];
  
  // Pour les produits personnalisés, afficher les détails de personnalisation
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
    
    // Ajouter les accessoires s'il y en a
    if (item.customProperties.accessoires && item.customProperties.accessoires.length > 0) {
      const accessoireNames = item.customProperties.accessoires
        .map(acc => acc.nomAccessoire)
        .join(', ');
      if (accessoireNames) {
        details.push(`Accessoires: ${accessoireNames}`);
      }
    }
    
    // Ajouter la durée de fabrication si disponible
    if (item.customProperties.dureeFabrication) {
      details.push(`Délai: ${item.customProperties.dureeFabrication}`);
    }
  } 
  // Pour les produits standards
  else {
    // Dimensions
    const dimensions = item.bassin?.dimensions ?? item.dimensions;
    if (dimensions) {
      details.push(
        Array.isArray(dimensions) 
          ? dimensions.filter(Boolean).join('x') + ' cm'
          : dimensions.includes('cm') ? dimensions : dimensions + ' cm'
      );
    }
    
    // Couleur
    const couleur = item.bassin?.couleur ?? item.couleur;
    if (couleur) {
      details.push(couleur);
    }
    
    // Matériau
    const materiau = item.bassin?.materiau ?? item.materiau;
    if (materiau) {
      details.push(
        Array.isArray(materiau) 
          ? materiau.filter(Boolean).join(', ')
          : materiau
      );
    }
  }
  
  return details.filter(Boolean).join(' • ') || 'Produit standard';
}
  


// Méthode améliorée pour incrémenter la quantité avec vérification de stock
incrementQuantity(item: PanierItem): void {
  if (!item) return;

  // Pour les produits personnalisés, pas de limite de stock
  if (item.isCustomized) {
    this.updateQuantity(item, item.quantity + 1);
    return;
  }

  // Pour les produits standards, vérifier le stock disponible
  const availableStock = item.bassin?.stock ?? 0;
  
  if (item.quantity >= availableStock) {
    this.toastService.showError(`Stock maximum atteint (${availableStock} unités)`);
    return;
  }
  
  this.updateQuantity(item, item.quantity + 1);
}

// Restreindre la modification des quantités au panier seulement
updateQuantity(item: PanierItem, newQuantity: number): void {
  if (!this.isCartOpen) return; // Ne permettre les modifications que lorsque le panier est ouvert
  
  if (newQuantity <= 0) {
      this.removeFromCart(item);
      return;
  }

  // Vérification du stock seulement pour les produits non personnalisés
  if (!item.isCustomized && item.bassin && item.bassin.stock < newQuantity) {
      this.toastService.showError(`Stock limité à ${item.bassin.stock} unités`);
      return;
  }

  this.cartService.updateQuantity(item, newQuantity).subscribe({
      next: (success) => {
          if (success) {
              this.toastService.showSuccess('Quantité mise à jour');
          }
      },
      error: (err) => {
          console.error('Error updating quantity:', err);
          this.toastService.showError('Erreur lors de la mise à jour');
      }
  });
}
// Ajout d'une méthode pour afficher correctement la promotion
getPromotionDisplay(item: PanierItem): string {
  if (!item || !item.promotionActive || item.tauxReduction === undefined) {
    return '';
  }

  // Vérifier si la promotion est toujours valide
  if (item.bassin?.promotion) {
    const now = new Date();
    const startDate = new Date(item.bassin.promotion.dateDebut);
    const endDate = new Date(item.bassin.promotion.dateFin);
    
    if (now < startDate || now > endDate) {
      return '';
    }
  } else if (!item.isCustomized) {
    // Si pas de promotion dans le bassin et pas un produit personnalisé
    return '';
  }
  
  return `-${item.tauxReduction}%`;
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
        next: (success) => {
          if (success) {
            this.toastService.showSuccess('Article supprimé du panier');
            this.loadInitialCartData(); // Use existing method instead
          } else {
            this.toastService.showError('Échec de la suppression');
          }
        },
        error: (error) => {
          console.error('Error removing item:', error);
          this.toastService.showError('Erreur lors de la suppression');
        }
      });
    }
  });
}


/****************
 * 
 * 
 * 
 * 
 * 
 */
/****************** */



/**
 * Vérifie si un article est en promotion
 */
// Pour vérifier si un item est en promotion
isItemOnPromotion(item: PanierItem): boolean {
  return item.promotionActive || false;
}


/**
 * Formate le taux de réduction
 */
formatReduction(tauxReduction: number | undefined): string {
  if (!tauxReduction) return '';
  return `-${tauxReduction}%`;
}

// Ajoutez cette méthode pour vérifier les promotions
private checkPromotions(): void {
  const now = new Date();
  let needsUpdate = false;

  this.cartItems.forEach(item => {
    if (item.bassin?.promotion) {
      const startDate = new Date(item.bassin.promotion.dateDebut);
      const endDate = new Date(item.bassin.promotion.dateFin);
      
      const isActive = now >= startDate && now <= endDate;
      
      if (isActive !== item.promotionActive) {
        item.promotionActive = isActive;
        if (isActive) {
          item.tauxReduction = item.bassin.promotion.tauxReduction;
        } else {
          item.tauxReduction = 0;
        }
        this.cartService.calculateEffectivePrice(item);
        needsUpdate = true;
      }
    }
  });

  if (needsUpdate) {
    this.totalPrice = this.calculateTotalPrice(this.cartItems);
    this.cdr.detectChanges();
  }
}

// Modifiez la méthode updateCartDisplay
private updateCartDisplay(panier: Panier | null): void {
  if (!panier) {
    this.cartItems = [];
    this.totalPrice = 0;
    return;
  }
  
  this.cartItems = panier.items?.map(item => {
    // Recalculer le prix effectif pour chaque item
    this.cartService.calculateEffectivePrice(item);
    return item;
  }) || [];
  
  this.totalPrice = this.calculateTotalPrice(this.cartItems);
  this.cdr.detectChanges();
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
  // Méthode pour gérer les erreurs d'images
  onImageError(event: any): void {
    event.target.src = 'assets/default-image.webp'; // Image par défaut
  }

}