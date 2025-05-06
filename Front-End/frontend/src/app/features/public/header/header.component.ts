import { ImageBassin } from './../../../core/models/image.models';
import {
  Component,
  HostListener,
  OnInit,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { AuthService } from '../../../core/authentication/auth.service';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  interval,
  map,
  Observable,
  of,
  Subject,
  Subscription,
  switchMap,
  takeUntil,
  tap,debounceTime,
  throwError,
  lastValueFrom,
  timeout,
} from 'rxjs';
import { Bassin } from '../../../core/models/bassin.models';
import { BassinService } from '../../../core/services/bassin.service';
import { CustomProperties, PanierItem } from '../../../core/models/panier-item.model';
import { Panier } from '../../../core/models/panier.model';
import Swal from 'sweetalert2';
import { Accessoire } from '../../../core/models/accessoire.models';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
 
})
export class HeaderComponent implements OnInit, OnDestroy {
  emptyCart = false;
  
  isMenuOpen = false;
  isDropdownOpen = false;
  isCartOpen = false;
  isAuthenticated = false;
  isClient = false;
  cartItems: PanierItem[] = [];
  totalPrice = 0;
  favoritesCount = 0;
  isLoading = false;
  private updateSubject = new Subject<void>();

  private cartSubscription: Subscription | null = null;
  private authSubscription: Subscription | null = null;
  private favoritesSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  isBrowser: boolean;
  // Mapping des images pour les matériaux
  materiauxImages: {[key: string]: string} = {
    'Béton fibré': 'assets/images/materials/concrete.webp',
    'Acier inoxydable': 'assets/images/materials/stainless-steel.webp',
    'Bois composite': 'assets/images/materials/wood-composite.webp',
    'Béton fibré haute performance': 'assets/img/materiaux/beton.jpg',
    'Polyéthylène haute densité (PEHD)': 'assets/img/materiaux/pehd.jpg',
    'Composite verre-résine': 'assets/img/materiaux/composite.jpg',
    'Acier inoxydable 316L (marine)': 'assets/img/materiaux/acier.jpg',
    "Tôle d'acier galvanisé à chaud": 'assets/img/materiaux/tole.jpg',
    'PVC renforcé': 'assets/img/materiaux/PVC.jpg',
    'Membrane EPDM épaisseur 1.5mm': 'assets/img/materiaux/Membrane.jpg',
    'Géomembrane HDPE': 'assets/img/materiaux/Géomembrane.jpg',
    'Pierre reconstituée': 'assets/img/materiaux/pierre.jpg',
    'Fibre de carbone': 'assets/img/materiaux/fibre.jpg',
    'Bâche armée PVC 900g/m²': 'assets/img/materiaux/bache.jpg',
    'Polypropylène expansé': 'assets/img/materiaux/Polypropylène.jpg',
    'Béton polymère': 'assets/img/materiaux/Béton.jpg',
    'Aluminium anodisé': 'assets/img/materiaux/Aluminium.jpg',
    'Titane grade 2': 'assets/img/materiaux/titane.jpg',
    'Résine époxy renforcée': 'assets/img/materiaux/resine.jpg'
  };

  colorMap: {[key: string]: string} = {
    'Bleu clair': '#7EC0EE',
    'Bleu foncé': '#1E90FF',
    'Blanc': '#FFFFFF',
    'Gris clair': '#D3D3D3', 
    'Gris foncé': '#A9A9A9',
    'Beige': '#F5F5DC',
    'Sable': '#F4A460',
    'Vert': '#90EE90',
    'Rouge': '#FF6347',
    'Noir': '#000000',
    'Marron': '#A0522D'
  };
  
  constructor(
    public authService: AuthService,
    private router: Router,
    private cartService: CartService,
    private favoritesService: FavoritesService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private bassinService: BassinService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
    });
  }

  ngOnInit(): void {
    this.initializeAuthSubscription();
    this.initializeCartSubscription();
    //  this.initializeFavoritesSubscription();
    this.loadInitialCartData();

    this.loadCartItems();

    this.cartService.cart$.subscribe((panier) => {
      this.updateCartDisplay(panier);
    });

    if (this.isBrowser) {
      // Vérifier les promotions toutes les minutes
      interval(60000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.checkPromotions();
        });
    }

     // Debounce updates to prevent rapid changes
        this.updateSubject.pipe(
          debounceTime(300),
          takeUntil(this.destroy$)
        ).subscribe(() => {
          
          this.cdr.markForCheck();
        });
  }

  private initializeAuthSubscription(): void {
    this.authSubscription = this.authService.isLoggedIn$
      .pipe(
        distinctUntilChanged(),
        tap((isLoggedIn) => {
          this.isAuthenticated = isLoggedIn;
          this.isClient = this.authService.isClient();
        }),
        switchMap((isLoggedIn) =>
          isLoggedIn
            ? this.cartService.forceRefreshCart()
            : this.cartService.getServerCart()
        ),
        catchError((err) => {
          console.error('Error loading cart:', err);
          return of(this.cartService.getLocalCart());
        })
      )
      .subscribe((panier: Panier) => {
        this.updateCartDisplay(panier);
      });
  }

  private initializeCartSubscription(): void {
    this.cartSubscription = this.cartService.panier$
      .pipe(
        distinctUntilChanged(
          (prev, curr) =>
            JSON.stringify(prev?.items) === JSON.stringify(curr?.items)
        )
      )
      .subscribe((panier) => {
        this.updateCartDisplay(panier);
        this.cdr.detectChanges();
      });
  }

  private loadInitialCartData(): void {
    const initialLoad$ = this.authService.isLoggedIn
      ? this.cartService.forceRefreshCart()
      : this.cartService.getServerCart();

    initialLoad$
      .pipe(catchError(() => of(this.cartService.getLocalCart())))
      .subscribe((panier: Panier) => {
        this.updateCartDisplay(panier);
      });
  }
  /*
  // Initialiser la souscription des favoris
  private initializeFavoritesSubscription(): void {
    if (this.isBrowser && this.favoritesService) {
      this.favoritesSubscription = this.favoritesService.favoritesCount$
        .pipe(takeUntil(this.destroy$))
        .subscribe((count: number) => {
          this.favoritesCount = count;
          this.cdr.detectChanges();
        });
    }
  }*/
  /**************** */

  private cleanImagePath(path: string): string {
    if (!path) return '';

    // Supprimer les parties inutiles du chemin
    const cleaned = path.replace(/^.*[\\\/]/, ''); // Supprime tout jusqu'au dernier / ou \

    // Supprimer les paramètres de requête s'il y en a
    return cleaned.split('?')[0];
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
      // Pour les articles personnalisés
      if (item.isCustomized) {
        const basePrice = item.prixOriginal || 0;
        const materiauPrice = item.customization?.prixMateriau || 0;
        const dimensionPrice = item.customization?.prixDimension || 0;
        const accessoiresPrice = item.prixAccessoires || 0;
        let totalPrice = basePrice + materiauPrice + dimensionPrice + accessoiresPrice;
        
        // Appliquer la promotion si active
        if (item.promotionActive && item.tauxReduction) {
          totalPrice = totalPrice * (1 - item.tauxReduction);
        }
        
        return total + (totalPrice * item.quantity);
      }
      // Pour les articles standard
      else {
        let itemPrice = item.effectivePrice || item.prixOriginal || 0;
        return total + (itemPrice * item.quantity);
      }
    }, 0);
  }

  get cartTotal(): string {
    const total = this.cartItems.reduce((sum, item) => {
      return sum + item.effectivePrice * item.quantity;
    }, 0);
    return this.formatPrice(total);
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

    if (
      dropdown &&
      button &&
      !dropdown.contains(event.target as Node) &&
      !button.contains(event.target as Node)
    ) {
      this.isDropdownOpen = false;
    }

    if (
      cartSidebar &&
      cartBtn &&
      !cartSidebar.contains(event.target as Node) &&
      !cartBtn.contains(event.target as Node)
    ) {
      this.isCartOpen = false;
    }
  }

  logout() {
    this.authService.logout();
    this.isDropdownOpen = false;
  }

  getUniqueItemsCount(): number {
    return this.cartItems.length; // Retourne le nombre d'articles uniques, pas la quantité totale
  }


  goToCart(): void {
    this.router.navigate(['/cart']);
    this.isCartOpen = false;
  }

  get uniqueItemsCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  getBassinDetails(item: PanierItem): string {
    if (!item) return 'Aucun détail disponible';

    const details = [];

    // Pour les produits personnalisés
    if (item.isCustomized && item.customProperties) {
      details.push('Bassin personnalisé');

      if (item.customProperties.bassinBase?.nom) {
        details.push(`Modèle: ${item.customProperties.bassinBase.nom}`);
      }

      if (item.customProperties.dimensionSelectionnee) {
        details.push(
          `Dimensions: ${item.customProperties.dimensionSelectionnee}`
        );
        if (item.customProperties.dimensionPrice) {
          details.push(
            `(+${item.customProperties.dimensionPrice.toFixed(2)} TND)`
          );
        }
      }

      if (item.customProperties.materiauSelectionne) {
        details.push(`Matériau: ${item.customProperties.materiauSelectionne}`);
        if (item.customProperties.materiauPrice) {
          details.push(
            `(+${item.customProperties.materiauPrice.toFixed(2)} TND)`
          );
        }
      }

      if (item.customProperties.couleurSelectionnee) {
        details.push(`Couleur: ${item.customProperties.couleurSelectionnee}`);
      }

      if (item.customProperties.accessoires?.length) {
        details.push(
          `Accessoires: ${item.customProperties.accessoires.length}`
        );
      }

      if (item.customProperties.dureeFabrication) {
        details.push(
          `Fabrication: ${item.customProperties.dureeFabrication} jours`
        );
      }
    }
    // Pour les produits standards
    else {
      details.push(`Bassin: ${item.nomBassin || 'Standard'}`);

      if (item.dimensions) {
        details.push(`Dimensions: ${item.dimensions}`);
      }

      if (item.materiau) {
        details.push(`Matériau: ${item.materiau}`);
      }

      if (item.couleur) {
        details.push(`Couleur: ${item.couleur}`);
      }

      if (item.customization!.dureeFabrication) {
        details.push(`Délai: ${item.customization!.dureeFabrication}`);
      }
    }

    return details.join(' • ') || 'Détails non spécifiés';
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

 
  /****************
   *
   * removeFromCart(item: PanierItem): void {
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
      cancelButtonColor: '#d33',
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
          },
        });
      }
    });
  }

   *
   *
   *
   */
  /****************** */

  /**
 * Vérifie si un article est en promotion

// Pour vérifier si un item est en promotion
isItemOnPromotion(item: PanierItem): boolean {
  return item.promotionActive || false;
}
 */

  /**
   * Formate le taux de réduction
   */
  formatReduction(tauxReduction: number | undefined): string {
    if (!tauxReduction) return '';
    return `-${tauxReduction}%`;
  }

  calculateSubtotal(item: PanierItem): number {
    const effectivePrice = this.calculateEffectivePrice(item);
    return this.roundPrice(effectivePrice * item.quantity);
  }
  // Ajoutez cette méthode pour vérifier les promotions
  private checkPromotions(): void {
    const now = new Date();
    let needsUpdate = false;

    this.cartItems.forEach((item) => {
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
          this.cartService.calculateEffectivePrix(item);
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) {
      this.totalPrice = this.calculateTotalPrice(this.cartItems);
      this.cdr.detectChanges();
    }
  }

  getReductionPercentage(item: PanierItem): string {
    if (!item || !item.promotionActive || item.tauxReduction === undefined)
      return '';
    return `-${item.tauxReduction}%`;
  }
  private loadBassinDetails(item: PanierItem): void {
    if (!item.bassinId) return;

    this.bassinService
      .getBassinDetails(item.bassinId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bassin) => {
          item.bassin = bassin;
          // Update image URL if not set
          if (!item.imageUrl && bassin.imagesBassin?.length) {
            item.imageUrl = `${
              this.bassinService.apiURL
            }/imagesBassin/getFS/${encodeURIComponent(
              bassin.imagesBassin[0].imagePath
            )}`;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading bassin details:', err);
        },
      });
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

  /*******
   *
   * Image Bassin
   */

  // Méthode pour gérer les erreurs d'images
  onImageError(event: any): void {
    event.target.src = 'assets/default-image.webp'; // Image par défaut
  }

  // Méthode améliorée pour afficher les détails des accessoires
  // Afficher les détails des accessoires
  getAccessoiresDetails(item: PanierItem): string {
    if (
      !item.isCustomized ||
      !item.customProperties?.accessoires ||
      item.customProperties.accessoires.length === 0
    ) {
      return 'Aucun accessoire';
    }

    // Formatage détaillé des accessoires avec leur prix
    const accessoiresList = item.customProperties.accessoires.map(
      (acc) => `${acc.nomAccessoire} (+${acc.prixAccessoire.toFixed(2)} TND)`
    );

    // Calculer le prix total des accessoires
    const totalAccessoires = item.customProperties.accessoires.reduce(
      (total, acc) => total + (acc.prixAccessoire || 0),
      0
    );

    // Si la liste est trop longue, simplifier l'affichage
    if (accessoiresList.length > 2) {
      return `${
        accessoiresList.length
      } accessoires (+${totalAccessoires.toFixed(2)} TND)`;
    }

    return accessoiresList.join(', ');
  }

  // Amélioration de la méthode pour obtenir l'image
  getFirstImage(item: PanierItem): string {
    // Pour les items personnalisés
    if (item.isCustomized) {
      // Priorité 1: URL d'image explicite
      if (item.customProperties?.imageUrl) {
        return item.customProperties.imageUrl;
      }

      // Priorité 2: Image du bassin base
      if (item.customProperties?.bassinBase?.imageUrl) {
        return item.customProperties.bassinBase.imageUrl;
      }

      // Priorité 3: Image basée sur le matériau
      const material =
        item.customProperties?.materiau ||
        item.customProperties?.materiauSelectionne;
      if (material && this.materiauxImages[material]) {
        return this.materiauxImages[material];
      }

      // Fallback
      return 'assets/default-image.webp';
    }

    // Pour les items standards - code inchangé
    if (item.bassin?.imagesBassin?.[0]?.imagePath) {
      return `${
        this.bassinService.apiURL
      }/imagesBassin/getFS/${encodeURIComponent(
        item.bassin.imagesBassin[0].imagePath
      )}`;
    }

    return 'assets/default-image.webp';
  }

  private formatDimensions(dimensions: string | string[] | undefined): string {
    if (!dimensions) return '';

    if (Array.isArray(dimensions)) {
      return dimensions.join(' x ') + ' cm';
    }
    return dimensions;
  }

  private formatMateriaux(materiau: string | string[] | undefined): string {
    if (!materiau) return '';

    if (Array.isArray(materiau)) {
      return materiau.join(', ');
    }
    return materiau;
  }

  getImageUrl(item: PanierItem): string {
    // Pour les items personnalisés
    if (item.isCustomized) {
      return item.customProperties?.imageUrl || 'assets/default-image.webp';
    }

    // Pour les items standards
    if (item.bassin?.imagesBassin?.[0]?.imagePath) {
      return `${
        this.bassinService.apiURL
      }/imagesBassin/getFS/${encodeURIComponent(
        item.bassin.imagesBassin[0].imagePath
      )}`;
    }

    return 'assets/default-image.webp';
  }

  getAccessoiresCount(item: PanierItem): number {
    if (!item.customProperties) return 0;
    if (!item.customProperties.accessoires) return 0;
    return item.customProperties.accessoires.length;
  }

  // Méthode pour vérifier si un item est en promotion
  isItemOnPromotion(item: PanierItem): boolean {
    return item.promotionActive || false;
  }

  // Méthode pour obtenir le stock disponible
  getSafeStock(item: PanierItem): number | null {
    return item.bassin?.stock ?? null;
  }

  // Calcul correct du prix pour un item personnalisé
  getTotalCustomPrice(item: PanierItem): number {
    if (!item.isCustomized || !item.customProperties) {
      return item.effectivePrice || item.prixOriginal || 0;
    }

    // Calculer la somme détaillée des composants
    const basePrice = item.customProperties.basePrice || 0;
    const materiauPrice = item.customProperties.materiauPrice || 0;
    const dimensionPrice = item.customProperties.dimensionPrice || 0;

    // Calculer le prix total des accessoires
    const accessoiresTotal =
      item.customProperties.accessoires?.reduce(
        (total, acc) => total + (acc.prixAccessoire || 0),
        0
      ) || 0;

    // Prix total avant promotion
    let totalPrice =
      basePrice + materiauPrice + dimensionPrice + accessoiresTotal;

    // Appliquer la promotion si active
    if (item.promotionActive && item.tauxReduction) {
      totalPrice = totalPrice * (1 - item.tauxReduction / 100);
    }

    return totalPrice;
  }

  // Formater correctement l'affichage du prix
  getDisplayPrice(item: PanierItem): string {
    if (!item) return '0.00 TND';

    let price;
    if (item.isCustomized) {
      price = this.getTotalCustomPrice(item);
    } else {
      price = item.effectivePrice ?? item.prixOriginal ?? 0;
    }

    const quantity = item.quantity ?? 1;
    return (price * quantity).toFixed(2) + ' TND';
  }

  // Fonction pour obtenir la durée de fabrication formatée
  // Affichage correct du temps de fabrication
  getFormattedFabricationTime(item: PanierItem): string {
    // Pour les bassins personnalisés
    if (
      item.isCustomized &&
      item.customProperties &&
      item.customProperties.dureeFabrication
    ) {
      const durFab = item.customProperties.dureeFabrication.toString();
      return `Délai de fabrication: ${durFab}${
        durFab.includes('jours') ? '' : ' jours'
      }`;
    }

    // Pour les bassins standards sur commande
    if (item.status === 'SUR_COMMANDE') {
      if (item.dureeFabrication) {
        return `Délai de fabrication: ${item.dureeFabrication}`;
      }

      if (
        item.bassin?.dureeFabricationJoursMin &&
        item.bassin?.dureeFabricationJoursMax
      ) {
        return `Délai de fabrication: ${item.bassin.dureeFabricationJoursMin} à ${item.bassin.dureeFabricationJoursMax} jours`;
      }

      if (item.bassin?.dureeFabricationDisplay) {
        return `Délai de fabrication: ${item.bassin.dureeFabricationDisplay}`;
      }
    }

    // Pour les bassins disponibles en stock
    return item.isCustomized ? 'Sur commande' : 'En stock';
  }

  getFabricationDuration(bassin: Bassin): string {
    if (!bassin) return '';

    // Si durée exacte est définie
    if (bassin.dureeFabricationJours) {
      return `Délai: ${bassin.dureeFabricationJours} jours`;
    }

    // Si min et max sont définis
    if (bassin.dureeFabricationJoursMin && bassin.dureeFabricationJoursMax) {
      if (bassin.dureeFabricationJoursMin === bassin.dureeFabricationJoursMax) {
        return `Délai: ${bassin.dureeFabricationJoursMin} jours`;
      } else {
        return `Délai: ${bassin.dureeFabricationJoursMin} à ${bassin.dureeFabricationJoursMax} jours`;
      }
    }

    // Valeur par défaut
    return 'Délai: 3 à 15 jours';
  }

  // Obtient le nom correct de l'item
  getItemName(item: PanierItem): string {
    if (item.isCustomized) {
      return item.customProperties?.bassinBase?.nom
        ? `${item.customProperties.bassinBase.nom} (Personnalisé)`
        : 'Bassin personnalisé';
    }
    return item.bassin?.nomBassin || item.nomBassin || 'Bassin';
  }

  // Obtient les détails de l'item
  getItemDetails(item: PanierItem): string {
    const details = [];

    if (item.isCustomized) {
      // Pour les bassins personnalisés
      if (item.customProperties?.dimensions) {
        details.push(`Dimensions: ${item.customProperties.dimensions}`);
      }
      if (item.customProperties?.materiau) {
        details.push(`Matériau: ${item.customProperties.materiau}`);
      }
      if (item.customProperties?.couleur) {
        details.push(`Couleur: ${item.customProperties.couleur}`);
      }
    } else {
      // Pour les bassins standards
      if (item.bassin?.dimensions) {
        details.push(`Dimensions: ${item.bassin.dimensions}`);
      }
      if (item.bassin?.materiau) {
        details.push(`Matériau: ${item.bassin.materiau}`);
      }
      if (item.bassin?.couleur) {
        details.push(`Couleur: ${item.bassin.couleur}`);
      }
    }

    return details.join(' • ') || 'Détails non spécifiés';
  }

  // Obtient la liste des accessoires formatée
  getAccessoriesList(item: PanierItem): string {
    if (!item.isCustomized || !item.customProperties?.accessoires?.length) {
      return 'Aucun accessoire';
    }

    return item.customProperties.accessoires
      .map((acc) => `${acc.nomAccessoire} (${acc.prixAccessoire.toFixed(2)}€)`)
      .join(', ');
  }

  // Calcule le prix effectif
  calculateEffectivePrice(item: PanierItem): number {
    let basePrice = item.prixOriginal || 0;
    
    // Ajout des suppléments pour les articles personnalisés
    if (item.isCustomized) {
      basePrice += (item.customization!.prixMateriau || 0) + (item.customization!.prixDimension || 0) + (item.prixAccessoires || 0);
    }
  
    // Application de la promotion si active
    if (item.promotionActive && item.tauxReduction) {
      // Le taux de réduction est déjà en décimal (0.25 pour 25%)
      return basePrice * (1 - item.tauxReduction);
    }
  
    return basePrice;
  }

  calculateTotalPrice(items: PanierItem[]): number {
    return items.reduce((total, item) => {
      // Prix unitaire de l'article (avec tous les suppléments)
      const unitPrice = this.getItemEffectivePrice(item);
      
      // Multiplication par la quantité
      return total + (unitPrice * item.quantity);
    }, 0);
  }
  
  // Pour le calcul du prix d'un article personnalisé
  getItemEffectivePrice(item: PanierItem): number {
    // Prix de base
    let basePrice = item.prixOriginal || 0;
    
    // Pour les articles personnalisés, ajouter les suppléments
    if (item.isCustomized) {
      const materiauPrice = item.customization?.prixMateriau || 0;
      const dimensionPrice = item.customization?.prixDimension || 0;
      const accessoiresPrice = this.getTotalAccessoriesPrice(item);
      
      basePrice += materiauPrice + dimensionPrice + accessoiresPrice;
    }
    
    // Appliquer la réduction si une promotion est active
    if (item.promotionActive && item.tauxReduction) {
      return basePrice * (1 - item.tauxReduction);
    }
    
    return basePrice;
  }

  // Proper price calculation with rounding
  calculateDiscountedPrice(
    originalPrice: number,
    discountPercent?: number
  ): number {
    if (!discountPercent) {
      return this.roundPrice(originalPrice);
    }
    const discount = (discountPercent * 100) / 100;
    return this.roundPrice(originalPrice * (1 - discount));
  }

  // Round to 2 decimal places
  roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  // Format price with currency
  formatPrice(price: number): string {
    return `${this.roundPrice(price)} TND`;
  }


  // Obtient la durée de fabrication formatée
  getItemFabricationTime(item: PanierItem): string {
    // Pour les bassins personnalisés
    if (item.isCustomized && item.customProperties?.dureeFabrication) {
      return `Fabrication: ${item.customProperties.dureeFabrication} jours`;
    }

    // Pour les bassins standards sur commande
    if (
      !item.isCustomized &&
      (item.status === 'SUR_COMMANDE' || item.bassin?.statut === 'SUR_COMMANDE')
    ) {
      if (item.customization!.dureeFabrication) {
        return `Fabrication: ${item.customization!.dureeFabrication}`;
      }
      if (item.bassin?.dureeFabricationDisplay) {
        return `Fabrication: ${item.bassin.dureeFabricationDisplay}`;
      }
      return 'Fabrication: 3-15 jours (estimation)';
    }

    return 'Vide';
  }

  // Vérifie si une promotion est active
  isPromoActive(item: PanierItem): boolean {
    if (!item.promotionActive || !item.bassin?.promotion) return false;

    const now = new Date();
    const start = new Date(item.bassin.promotion.dateDebut);
    const end = new Date(item.bassin.promotion.dateFin);

    return now >= start && now <= end;
  }

  // Obtient le temps restant pour la promotion
  getPromoTimeLeft(item: PanierItem): string {
    if (!this.isPromoActive(item)) return '';

    const end = new Date(item.bassin!.promotion!.dateFin);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return `(Expire dans ${days}j ${hours}h)`;
  }

  // Ajoutez cette méthode pour résoudre l'erreur
  closeCart(): void {
    // Implémentez la logique de fermeture du panier
    this.isCartOpen = false;
  }

  // Dans votre composant de panier
  getBassinBase(item: PanierItem): any {
    if (item.isCustomized && item.customProperties?.bassinBase) {
      return item.customProperties.bassinBase;
    }
    return null;
  }

  // Mise à jour du panier avec animation
  updateCartDisplay(panier: Panier | null): void {
    this.isLoading = true;

    // Sauvegarde de l'ancien nombre d'articles
    const previousCount = this.cartItemCount;

    if (!panier) {
      this.cartItems = [];
      this.totalPrice = 0;
      this.isLoading = false;
      return;
    }

    this.cartItems =
      panier.items?.map((item) => {
        // S'assurer que les détails du bassin sont chargés
        if (item.bassinId && !item.bassin) {
          this.loadBassinDetails(item);
        }

        // Pour les items personnalisés, s'assurer que toutes les propriétés sont correctement définies
        if (item.isCustomized) {
          // Créer ou mettre à jour customProperties si nécessaire
          if (!item.customProperties) {
            item.customProperties = {
              materiauPrice: item.customization!.prixMateriau || 0,
              dimensionPrice: item.customization!.prixDimension || 0,
              accessoiresPrice: item.prixAccessoires || 0,
              basePrice: item.prixOriginal || 0,
              prixEstime: item.customization!.prixEstime || 0,
              dureeFabrication: item.dureeFabrication || 'À déterminer',
              materiauSelectionne: item.customization!.materiauSelectionne,
              dimensionSelectionnee: item.customization!.dimensionSelectionnee,
              couleurSelectionnee: item.customization!.couleurSelectionnee,
            };
          }

          // S'assurer que les propriétés du customProperties sont définies correctement
          item.customProperties.materiauPrice = item.customization!.prixMateriau || 0;
          item.customProperties.dimensionPrice = item.customization!.prixDimension || 0;
          item.customProperties.accessoiresPrice = item.prixAccessoires || 0;
          item.customProperties.basePrice = item.prixOriginal || 0;
          item.customProperties.prixEstime = item.customization!.prixEstime || 0;

          // Garder la cohérence des propriétés entre item et customProperties
          item.customization!.materiauSelectionne =
            item.customization!.materiauSelectionne ||
            item.customProperties.materiauSelectionne;
          item.customization!.dimensionSelectionnee =
            item.customization!.dimensionSelectionnee ||
            item.customProperties.dimensionSelectionnee;
          item.customization!.couleurSelectionnee =
            item.customization!.couleurSelectionnee ||
            item.customProperties.couleurSelectionnee;

          // S'assurer que le prix effectif est bien le prix estimé pour les items personnalisés
// Use nullish coalescing to provide default value
item.effectivePrice = item.customization?.prixEstime ?? item.prixOriginal;        } else {
          // Calculer le prix effectif pour les items standard
          item.effectivePrice = this.calculateEffectivePrice(item);
        }

        // Calculer le sous-total
        item.subtotal = item.effectivePrice * item.quantity;

        return item;
      }) || [];

    this.totalPrice = this.calculateTotalPrice(this.cartItems);
    this.cdr.detectChanges();
    this.isLoading = false;

    // Animation du compteur si le nombre d'articles a augmenté
    const currentCount = this.cartItemCount;
    if (currentCount > previousCount && isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
          cartCountElement.classList.add('updated');

          // Retirer la classe après l'animation
          setTimeout(() => {
            cartCountElement.classList.remove('updated');
          }, 800);
        }
      });
    }
  }

  // Méthode pour obtenir les détails complets de personnalisation
  getFullCustomizationDetails(item: PanierItem): any {
    if (!item.isCustomized) return null;

    // S'assurer que toutes les données de personnalisation sont disponibles
    const accessoires =
      item.customProperties?.accessoires ||
      item.accessoireIds?.map((id) => {
        return {
          idAccessoire: id,
          nomAccessoire: this.getAccessoireName(id),
          prixAccessoire: this.getAccessoirePrice(id),
        };
      }) ||
      [];

    return {
      bassin: {
        nom: item.nomBassin || 'Bassin personnalisé',
        id: item.bassinId,
      },
      dimensions: item.customization!.dimensionSelectionnee || item.dimensions,
      materiau: item.customization!.materiauSelectionne || item.materiau,
      couleur: item.customization!.couleurSelectionnee || item.couleur,
      accessoires: accessoires,
      dureeFabrication: item.dureeFabrication || 'À déterminer',
      prices: {
        base: item.prixOriginal,
        materiau: item.customization!.prixMateriau,
        dimension: item.customization!.prixDimension,
        accessoires: item.prixAccessoires,
        total: item.customization!.prixEstime,
      },
    };
  }
  getAccessoireName(accessoireId: number): string {
    // Implémentez cette méthode pour retourner le nom de l'accessoire
    // Soit via un service, soit depuis une liste locale
    return 'Accessoire ' + accessoireId;
  }

  getAccessoirePrice(accessoireId: number): number {
    // Implémentez cette méthode pour retourner le prix de l'accessoire
    // Soit via un service, soit depuis une liste locale
    return 0;
  }
  // Méthode pour afficher les détails dans le template

  getDisplayDetails(item: PanierItem): string {
    if (!item.isCustomized) return 'Produit standard';

    const details = [];
    const custom = this.getFullCustomizationDetails(item);

    if (custom?.bassin?.nom) {
      details.push(`Modèle: ${custom.bassin.nom}`);
    }

    if (custom?.dimensions) {
      details.push(`Dimensions: ${custom.dimensions}`);
    }

    if (custom?.materiau) {
      details.push(`Matériau: ${custom.materiau}`);
    }

    if (custom?.couleur) {
      details.push(`Couleur: ${custom.couleur}`);
    }

    if (custom?.accessoires?.length) {
      details.push(`${custom.accessoires.length} accessoire(s)`);
    }

    return details.join(' • ');
  }
  // Correction pour le compteur de panier
  get cartItemCount(): number {
    // Retourne la somme des quantités de tous les articles
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  // Méthode pour fermer le menu sur mobile lors du clic sur un lien
  closeMenuOnMobile(): void {
    if (window.innerWidth <= 768) {
      this.isMenuOpen = false;
    }
  }

  // Méthode pour vérifier si le menu est ouvert sur mobile
  isMobileMenuOpen(): boolean {
    return this.isMenuOpen && window.innerWidth <= 768;
  }

  // Méthode améliorée pour gérer le click outside sans utiliser de directive externe
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isBrowser) return;

    // Sélecteurs pour les éléments DOM
    const profileBtn = document.querySelector('.profile-btn');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const cartBtn = document.querySelector('.cart-btn');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const navigation = document.querySelector('.navigation');

    // Gérer le dropdown du profil
    if (
      profileBtn &&
      dropdownMenu &&
      !profileBtn.contains(event.target as Node) &&
      !dropdownMenu.contains(event.target as Node)
    ) {
      this.isDropdownOpen = false;
    }

    // Gérer le panier sidebar
    if (
      cartBtn &&
      cartSidebar &&
      !cartBtn.contains(event.target as Node) &&
      !cartSidebar.contains(event.target as Node)
    ) {
      this.isCartOpen = false;
    }

    // Gérer la navigation mobile
    if (
      menuToggle &&
      navigation &&
      !menuToggle.contains(event.target as Node) &&
      !navigation.contains(event.target as Node)
    ) {
      this.closeMenuOnMobile();
    }

    // Mettre à jour le détecteur de changements
    this.cdr.detectChanges();
  }

  // Méthode pour calculer le total des accessoires
  public calculateAccessoiresTotal(
    accessoires: Accessoire[] | undefined
  ): number {
    if (!accessoires) return 0;
    return accessoires.reduce(
      (total, acc) => total + (acc.prixAccessoire || 0),
      0
    );
  }
  // Méthode pour appliquer une promotion
  private applyPromotion(price: number, tauxReduction?: number): number {
    return tauxReduction ? price * (1 - tauxReduction / 100) : price;
  }

  // Gestion des erreurs améliorée
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Erreur serveur';
    if (error.status === 409) errorMessage = 'Stock insuffisant';
    else if (error.status === 400) errorMessage = 'Données invalides';
    else if (error.status === 404) errorMessage = 'Produit non trouvé';
    return throwError(() => errorMessage);
  }
  async incrementQuantity(item: PanierItem): Promise<void> {
    try {
      // Pour les produits personnalisés, pas de limite de quantité
      if (item.isCustomized) {
        await this.updateQuantity(item, item.quantity + 1);
        return;
      }
  
      // Vérification du stock pour les produits standard
      if (!item.bassin || item.bassin.stock === undefined) {
        await Swal.fire({
          title: 'Information manquante',
          text: 'Impossible de vérifier le stock pour ce produit',
          icon: 'warning',
          confirmButtonText: 'OK'
        });
        return;
      }
  
      if (item.quantity >= item.bassin.stock) {
        await Swal.fire({
          title: 'Quantité maximale',
          html: `Vous avez atteint la quantité maximale disponible pour ce produit (${item.bassin.stock})`,
          icon: 'info',
          confirmButtonText: 'Compris'
        });
        return;
      }
  
      await this.updateQuantity(item, item.quantity + 1);
      
    } catch (error) {
      console.error('Erreur:', error);
      await Swal.fire({
        title: 'Erreur',
        text: 'Nous n\'avons pas pu modifier la quantité',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
  
  async decrementQuantity(item: PanierItem): Promise<void> {
    try {
      const newQuantity = item.quantity - 1;
      
      if (newQuantity <= 0) {
        const result = await Swal.fire({
          title: 'Supprimer cet article ?',
          text: 'Voulez-vous vraiment retirer cet article de votre panier ?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Oui, supprimer',
          cancelButtonText: 'Annuler'
        });
        
        if (result.isConfirmed) {
          await this.removeFromCart(item);
        }
      } else {
        await this.updateQuantity(item, newQuantity);
      }
    } catch (error) {
      console.error('Erreur:', error);
      await Swal.fire({
        title: 'Erreur',
        text: 'Nous n\'avons pas pu modifier la quantité',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
  
  private async updateQuantity(item: PanierItem, newQuantity: number): Promise<void> {
    try {
      await lastValueFrom(this.cartService.updateQuantity(item, newQuantity).pipe(timeout(3000)));
      
      // Feedback visuel discret
      const toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
      
      await toast.fire({
        icon: 'success',
        title: 'Quantité mise à jour'
      });
      
    } catch (error) {
      console.error('Erreur:', error);
      throw error; // Remonte l'erreur pour la gérer dans la méthode appelante
    }
  }

  // Méthode pour obtenir le nom complet de l'article
  getItemFullName(item: PanierItem): string {
    if (item.isCustomized) {
      const baseName =
        item.customProperties?.bassinBase?.nom || 'Bassin personnalisé';
      return `${baseName} (Personnalisé)`;
    }
    return item.bassin?.nomBassin || item.nomBassin || 'Bassin';
  }

  // Méthode pour obtenir l'image principale
  getMainImage(item: PanierItem): string {
    if (item.isCustomized) {
      // Priorité à l'image du bassin de base
      if (item.customProperties?.bassinBase?.imageUrl) {
        return item.customProperties.bassinBase.imageUrl;
      }
      // Fallback à l'image du matériau
      const material =
        item.customProperties?.materiauSelectionne ||
        item.customProperties?.materiau;
      if (material && this.materiauxImages[material]) {
        return this.materiauxImages[material];
      }
      return 'assets/default-image.webp';
    }

    // Pour les bassins standards
    if (item.bassin?.imagesBassin?.[0]?.imagePath) {
      return `${
        this.bassinService.apiURL
      }/imagesBassin/getFS/${encodeURIComponent(
        item.bassin.imagesBassin[0].imagePath
      )}`;
    }
    return 'assets/default-image.webp';
  }


  // Méthode pour obtenir les détails de personnalisation
  getCustomizationDetails(item: PanierItem): string[] {
    const details: string[] = []; // Explicitement typé comme string[]

    if (!item.isCustomized) return details;

    if (item.customProperties?.dimensionSelectionnee) {
      details.push(
        `Dimensions: ${item.customProperties.dimensionSelectionnee}`
      );
    }

    if (item.customProperties?.materiauSelectionne) {
      details.push(`Matériau: ${item.customProperties.materiauSelectionne}`);
    }

    if (item.customProperties?.couleurSelectionnee) {
      details.push(`Couleur: ${item.customProperties.couleurSelectionnee}`);
    }

    return details;
  }

  // Méthode pour obtenir les détails des accessoires
  getAccessoriesDetails(item: PanierItem): { name: string; price: number }[] {
    if (!item.isCustomized || !item.customProperties?.accessoires) {
      return [];
    }
    return item.customProperties.accessoires.map((acc) => ({
      name: acc.nomAccessoire,
      price: acc.prixAccessoire,
    }));
  }

  // Calcul du prix total des accessoires
  calculateAccessoriesTotal(item: PanierItem): number {
    if (!item.isCustomized || !item.customProperties?.accessoires) {
      return 0;
    }
    return item.customProperties.accessoires.reduce(
      (total, acc) => total + (acc.prixAccessoire || 0),
      0
    );
  }

  // Formatage de la durée de fabrication
  getFabricationTime(item: PanierItem): string {
    if (item.isCustomized && item.customProperties?.dureeFabrication) {
      return `${item.customProperties.dureeFabrication} jours`;
    }

    if (item.bassin?.dureeFabricationDisplay) {
      return item.bassin.dureeFabricationDisplay;
    }

    return item.dureeFabrication || '3-15 jours';
  }

  getMaterialImage(material: string): string | null {
    const materialImages: { [key: string]: string } = {
      'Béton fibré': 'assets/images/materials/concrete.webp',
      'Acier inoxydable': 'assets/images/materials/stainless-steel.webp',
      'Bois composite': 'assets/images/materials/wood-composite.webp',
      'Béton fibré haute performance': 'assets/img/materiaux/beton.jpg',
      'Polyéthylène haute densité (PEHD)': 'assets/img/materiaux/pehd.jpg',
      'Composite verre-résine': 'assets/img/materiaux/composite.jpg',
      'Acier inoxydable 316L (marine)': 'assets/img/materiaux/acier.jpg',
      "Tôle d'acier galvanisé à chaud": 'assets/img/materiaux/tole.jpg',
      'PVC renforcé': 'assets/img/materiaux/PVC.jpg',
      'Membrane EPDM épaisseur 1.5mm': 'assets/img/materiaux/Membrane.jpg',
      'Géomembrane HDPE': 'assets/img/materiaux/Géomembrane.jpg',
      'Pierre reconstituée': 'assets/img/materiaux/pierre.jpg',
      'Fibre de carbone': 'assets/img/materiaux/fibre.jpg',
      'Bâche armée PVC 900g/m²': 'assets/img/materiaux/bache.jpg',
      'Polypropylène expansé': 'assets/img/materiaux/Polypropylène.jpg',
      'Béton polymère': 'assets/img/materiaux/Béton.jpg',
      'Aluminium anodisé': 'assets/img/materiaux/Aluminium.jpg',
      'Titane grade 2': 'assets/img/materiaux/titane.jpg',
      'Résine époxy renforcée': 'assets/img/materiaux/resine.jpg',
    };

    return materialImages[material] || null;
  }

  /*********************
   * 

   */
  loadCartItems(): void {

    this.cartService.getCartItems().subscribe(
      (response: any) => {
        console.log('Raw cart data:', response);
        if (response?.cart?.items) {
          this.cartItems = response.cart.items.map((item: any) => {
            // Mapper les propriétés de personnalisation
            if (item.isCustomized) {
              item.customProperties = {
                ...item.customProperties,
                materiauSelectionne: item.customization?.materiauSelectionne,
                dimensionSelectionnee: item.customization?.dimensionSelectionnee,
                couleurSelectionnee: item.customization?.couleurSelectionnee,
                prixEstime: item.customization?.prixEstime,
                dureeFabrication: item.customization?.dureeFabrication,
                materiauPrice: item.customization?.prixMateriau || 0,
                dimensionPrice: item.customization?.prixDimension || 0,
                accessoiresPrice: item.prixAccessoires || 0,
                basePrice: item.prixOriginal || 0,
                accessoires: item.accessoires || []
              };
              
              // S'assurer que les propriétés sont bien accessibles au niveau racine
              item.materiauSelectionne = item.customization?.materiauSelectionne;
              item.dimensionSelectionnee = item.customization?.dimensionSelectionnee;
              item.couleurSelectionnee = item.customization?.couleurSelectionnee;
              item.prixMateriau = item.customization?.prixMateriau;
              item.prixDimension = item.customization?.prixDimension;
              item.prixEstime = item.customization?.prixEstime;
              item.dureeFabrication = item.customization?.dureeFabrication;
            }
            return this.mapCartItem(item);
          });
        }
      },
      error => console.error('Error loading cart items', error)
    );
  }
  mapCartItem(item: any): PanierItem {
    // Extraire et normaliser les données de customization
    const customizationData = {
      materiauSelectionne: item.materiauSelectionne || 
                           (item.customization && item.customization.materiauSelectionne) || 
                           null,
      dimensionSelectionnee: item.dimensionSelectionnee || 
                            (item.customization && item.customization.dimensionSelectionnee) || 
                            null,
      couleurSelectionnee: item.couleurSelectionnee || 
                           (item.customization && item.customization.couleurSelectionnee) || 
                           null,
      prixMateriau: item.prixMateriau || 
                   (item.customization && item.customization.prixMateriau) || 
                   0,
      prixDimension: item.prixDimension || 
                    (item.customization && item.customization.prixDimension) || 
                    0,
      prixEstime: item.prixEstime || 
                 (item.customization && item.customization.prixEstime) || 
                 item.prixOriginal || 
                 0,
      dureeFabrication: item.dureeFabrication || 
                       (item.customization && item.customization.dureeFabrication) || 
                       null
    };
  
    // Construire l'objet customization explicitement
    const customization = {
      materiauSelectionne: customizationData.materiauSelectionne,
      prixMateriau: customizationData.prixMateriau,
      dimensionSelectionnee: customizationData.dimensionSelectionnee,
      prixDimension: customizationData.prixDimension,
      couleurSelectionnee: customizationData.couleurSelectionnee,
      prixEstime: customizationData.prixEstime,
      dureeFabrication: customizationData.dureeFabrication
    };
  
    // Construire l'objet customProperties
    const customProperties: CustomProperties = {
      materiauSelectionne: customizationData.materiauSelectionne,
      dimensionSelectionnee: customizationData.dimensionSelectionnee,
      couleurSelectionnee: customizationData.couleurSelectionnee,
      prixEstime: customizationData.prixEstime,
      dureeFabrication: customizationData.dureeFabrication || '',
      materiauPrice: customizationData.prixMateriau,
      dimensionPrice: customizationData.prixDimension,
      accessoiresPrice: item.prixAccessoires || 0,
      basePrice: item.prixOriginal || 0,
      imageUrl: item.imageUrl || item.customImageUrl,
      isCustomized: item.isCustomized || false,
      accessoires: item.accessoires || [],
      nomBassin: item.nomBassin,
      bassinBase: item.bassinBase || {
        id: item.bassinId,
        nom: item.nomBassin || '',
        imageUrl: item.imageUrl || '',
        prix: item.prixOriginal || 0
      }
    };
  
    // Calculer les prix efficaces
    const effectivePrice = item.effectivePrice || 
                           customizationData.prixEstime || 
                           (item.promotionActive ? item.prixPromo : item.prixOriginal) || 
                           0;
    
    const subtotal = effectivePrice * (item.quantity || 1);
  
    // Créer l'objet PanierItem complet
    const mappedItem: PanierItem = {
      id: item.id,
      quantity: item.quantity || 1,
      bassinId: item.bassinId,
      nomBassin: item.nomBassin,
      description: item.description,
      
      // Assignation explicite de l'objet customization
      customization: customization,
      
      // Pricing properties
      prixUnitaire: effectivePrice,
      prixOriginal: item.prixOriginal || 0,
      prixAccessoires: item.prixAccessoires || 0,
      effectivePrice: effectivePrice,
      subtotal: subtotal,
      prix: item.prix || item.prixOriginal || 0,
      prixPromo: item.prixPromo,
      
      // Promotion properties
      promotionActive: item.promotionActive || false,
      nomPromotion: item.nomPromotion,
      tauxReduction: item.tauxReduction || 0,
      
      // Status
      status: item.status || 'SUR_COMMANDE',
      surCommande: item.status === 'SUR_COMMANDE' || Boolean(item.isCustomized),
      
      // Customization properties
      isCustomized: Boolean(item.isCustomized),
      customProperties: customProperties,
      
      // Visual properties
      imageUrl: item.imageUrl,
      customImageUrl: item.customImageUrl,
      
      // Accessories
      accessoires: item.accessoires || [],
      accessoireIds: item.accessoireIds || [],
      
      // Dimension, material and color directly accessible
      dureeFabrication: customizationData.dureeFabrication,
      dureeFabricationDisplay: customizationData.dureeFabrication ? 
                               `${customizationData.dureeFabrication} jours` : 
                               'Non spécifié',
      
      // Optional bassin reference
      bassin: item.bassin,
      bassinBase: item.bassinBase || {
        id: item.bassinId,
        nom: item.nomBassin || '',
        imageUrl: item.imageUrl || '',
        prix: item.prixOriginal || 0
      }
    };
  
    // Log pour debugging
    console.log('Mapped item:', mappedItem);
    console.log('Customization data:', mappedItem.customization);
    
    return mappedItem;
  }

  getItemImage(item: PanierItem): string {
    // Pour les articles personnalisés
    if (item.isCustomized) {
      // 1. Essayer d'abord l'URL d'image directe
      if (item.imageUrl) {
        return this.getFullImagePath(item.imageUrl);
      }
      
      // 2. Essayer l'image du matériau
      if (item.customization!.materiauSelectionne && this.materiauxImages[item.customization!.materiauSelectionne]) {
        return this.materiauxImages[item.customization!.materiauSelectionne];
      }
      
      // 3. Essayer via customProperties
      if (item.customProperties?.bassinBase?.imageUrl) {
        return this.getFullImagePath(item.customProperties.bassinBase.imageUrl);
      }
    } else {
      // Pour les articles standard
      if (item.imageUrl) {
        return this.getFullImagePath(item.imageUrl);
      }
      
      if (item.bassin?.imagesBassin?.[0]?.imagePath) {
        return `${this.bassinService.apiURL}/imagesBassin/getFS/${encodeURIComponent(item.bassin.imagesBassin[0].imagePath)}`;
      }
    }
    
    // Image par défaut
    return 'assets/default-image.webp';
  }

  getFullImagePath(path: string): string {
    // Si l'URL est déjà complète, la retourner telle quelle
    if (path.startsWith('http') || path.startsWith('assets/')) {
      return path;
    }
    
    // Sinon construire l'URL complète
    return `${this.bassinService.apiURL}/imagesBassin/getFS/${encodeURIComponent(path)}`;
  }

  handleImageError(event: any, item: PanierItem): void {
    const target = event.target as HTMLImageElement;
    
    // Essayer l'image du matériau pour les personnalisés
    if (item.isCustomized && item.customization!.materiauSelectionne) {
      const materialImage = this.materiauxImages[item.customization!.materiauSelectionne];
      if (materialImage) {
        target.src = materialImage;
        return;
      }
    }
    
    // Fallback générique
    target.src = 'assets/default-image.webp';
  }

  
  confirmRemoveFromCart(item: PanierItem): void {
    Swal.fire({
      title: 'Supprimer cet article ?',
      html: `Souhaitez-vous retirer <strong>${item.nomBassin || 'cet article'}</strong> de votre panier ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (result.isConfirmed) {
        this.removeFromCart(item);
      }
    });
  }

  updateItemQuantity(item: PanierItem, newQuantity: number): void {
    this.cartService.updateCartItemQuantity(item.id, newQuantity).subscribe(
      response => {
        // Mettre à jour l'article local
        item.quantity = newQuantity;
        item.subtotal = item.effectivePrice * newQuantity;
      },
      error => console.error('Error updating quantity', error)
    );
  }

  removeFromCart(item: PanierItem): void {
    this.cartService.removeFromCart(item.id).subscribe(
      response => {
        // Retirer l'article de la liste
        this.cartItems = this.cartItems.filter(i => i.id !== item.id);
      },
      error => console.error('Error removing item from cart', error)
    );
  }

  // Méthode pour obtenir la description du bassin
  getItemDescription(item: PanierItem): string {
    if (item.isCustomized) {
      return `Bassin personnalisé avec ${item.customization!.materiauSelectionne || 'matériau standard'},
       dimensions ${item.customization!.dimensionSelectionnee || 'standard'}`;
    } else {
      return item.bassin?.description || item.description || '';
    }
  }

  // Calcule les suppléments pour les articles personnalisés
  calculateSupplements(item: PanierItem): number {
    if (!item.isCustomized) return 0;
    
    const materiauPrice = item.customization?.prixMateriau || 0;
    const dimensionPrice = item.customization?.prixDimension || 0;
    const accessoiresPrice = item.prixAccessoires || 0;
    
    return materiauPrice + dimensionPrice + accessoiresPrice;
  }

// Calcule la réduction pour un article
calculateReduction(item: PanierItem): number {
  if (!item.promotionActive || !item.tauxReduction) return 0;
  
  const basePrice = item.prixOriginal || 0;
  const supplements = item.isCustomized ? this.calculateSupplements(item) : 0;
  const totalBeforeDiscount = basePrice + supplements;
  
  return totalBeforeDiscount * item.tauxReduction;
}



// Obtenir le prix total de tous les accessoires
getTotalAccessoriesPrice(item: PanierItem): number {
  if (!item.accessoires || item.accessoires.length === 0) return 0;
  
  return item.accessoires.reduce((total, acc) => total + (acc.prixAccessoire || 0), 0);
}

// Format du délai de fabrication
getFormattedDuration(item: PanierItem): string {
  if (item.isCustomized && item.customization?.dureeFabrication) {
    return `${item.customization.dureeFabrication} jours`;
  } else if (item.bassin?.dureeFabricationJoursMin && item.bassin?.dureeFabricationJoursMax) {
    return `${item.bassin.dureeFabricationJoursMin} à ${item.bassin.dureeFabricationJoursMax} jours`;
  } else if (item.dureeFabrication) {
    return `${item.dureeFabrication}`;
  }
  return '2';
}

getColorCode(colorName: string): string {
  return this.colorMap[colorName] || '#CCCCCC'; // Retourne gris clair par défaut si non trouvé
}

getColorPreview(color: string | undefined): string {
  if (!color) return '#CCCCCC';
  
  // Vérifie d'abord dans le mapping prédéfini
  const mappedColor = this.colorMap[color];
  if (mappedColor) return mappedColor;
  
  // Accepte directement les codes hexadécimaux valides
  if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
    return color;
  }

  // Vérifie les noms de couleur CSS valides
  const ctx = document.createElement('canvas').getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    if (ctx.fillStyle !== color) { // Si le navigateur a reconnu la couleur
      return ctx.fillStyle;
    }
  }

  return '#CCCCCC'; // Couleur par défaut
}

areAccessoiresIdentical(ids1?: number[], ids2?: number[]): boolean {
  // Cas où les deux sont undefined ou vides
  if (!ids1 && !ids2) return true;
  
  // Un seul est undefined ou leurs longueurs diffèrent
  if (!ids1 || !ids2 || ids1.length !== ids2.length) return false;
  
  // Cas rapide pour tableaux identiques (même ordre)
  if (JSON.stringify(ids1) === JSON.stringify(ids2)) return true;
  
  // Comparaison indépendante de l'ordre avec Set
  const set1 = new Set(ids1);
  return ids2.every(id => set1.has(id));
}
getStatusDisplay(item: PanierItem): string {
  if (item.isCustomized) {
    return 'Personnalisé';
  }
  switch(item.status) {
    case 'DISPONIBLE': return 'En stock';
    case 'SUR_COMMANDE': return 'Sur commande';
    case 'RUPTURE_STOCK': return 'Rupture de stock';
    default: return item.bassin?.statut || 'Statut inconnu';
  }
}






}
