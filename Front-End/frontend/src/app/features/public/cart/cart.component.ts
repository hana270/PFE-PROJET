import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, interval, takeUntil, debounceTime } from 'rxjs';
import { PanierItem } from '../../../core/models/panier-item.model';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { Bassin } from '../../../core/models/bassin.models';
import { AuthService } from '../../../core/authentication/auth.service';
import { BassinService } from '../../../core/services/bassin.service';
import { isPlatformBrowser } from '@angular/common';
import Swal from 'sweetalert2';
import { AuthStateService } from '../../../core/services/auth-state.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: PanierItem[] = [];
  subtotal: number = 0;
  vatRate: number = 0.18;
  vatAmount: number = 0;
  total: number = 0;
  isLoading: boolean = true;
  errorMessage: string = '';
  discount: number = 0;
  isBrowser: boolean = false;
  lastUpdate: Date | null = null;

  private cartSubscription!: Subscription;
  private promotionCheckInterval!: Subscription;
  private destroy$ = new Subject<void>();
  private updateSubject = new Subject<void>();

  materiauxImages: { [key: string]: string } = {
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
    'Bois composite': 'assets/img/materiaux/bois.jpg',
    'Résine époxy renforcée': 'assets/img/materiaux/resine.jpg',
  };

  colorMap: { [key: string]: string } = {
    'Bleu clair': '#7EC0EE',
    'Bleu foncé': '#1E90FF',
    Blanc: '#FFFFFF',
    'Gris clair': '#D3D3D3',
    'Gris foncé': '#A9A9A9',
    Beige: '#F5F5DC',
    Sable: '#F4A460',
    Vert: '#90EE90',
    Rouge: '#FF6347',
    Noir: '#000000',
    Marron: '#A0522D',
  };

  isAuthenticated: boolean = false;

  constructor(
    private cartService: CartService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public authStateService: AuthStateService,
    public authService: AuthService,
    private bassinService: BassinService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Debounce updates to prevent rapid changes
    this.updateSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.calculateTotals();
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.cartService.forceRefreshCart().subscribe({
        next: (cart) => {
          console.log('Panier rafraîchi:', cart);
          this.lastUpdate = new Date();
        },
        error: (err) => console.error('Erreur lors du rafraîchissement du panier:', err)
      });

      this.authStateService.isLoggedIn$.subscribe(isLoggedIn => {
        this.isAuthenticated = isLoggedIn;
        this.cdr.markForCheck();
      });

      this.loadCart();
      this.setupPromotionCheck();
    }
  }

  private setupPromotionCheck(): void {
    if (this.isBrowser) {
      // Check every 5 minutes instead of every minute
      this.promotionCheckInterval = interval(300000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.checkPromotionsUpdates();
        });

      // Check when tab becomes visible
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

    if (this.isBrowser) {
      document.removeEventListener('visibilitychange', () => {});
    }
  }

  checkPromotionsUpdates(): void {
    if (this.cartItems.length === 0 || !this.isBrowser) return;

    this.bassinService.listeBassinsAvecPromotions().subscribe({
      next: (updatedBassins) => {
        let needsUpdate = false;

        this.cartItems.forEach((item) => {
          if (item.bassinId) {
            const updatedBassin = updatedBassins.find(b => b.idBassin === item.bassinId);
            if (updatedBassin) {
              const oldPrice = this.getEffectivePrice(item);

              const now = new Date();
              const startDate = new Date(updatedBassin.promotion?.dateDebut || '');
              const endDate = new Date(updatedBassin.promotion?.dateFin || '');

              const isPromoActive = updatedBassin.promotion && now >= startDate && now <= endDate;

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
          this.lastUpdate = new Date();
          this.toastService.showInfo('Promotions mises à jour', 2000);
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Erreur vérification promotions:', err);
      }
    });
  }

  loadCart(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cartSubscription = this.cartService.getCartItems().subscribe({
      next: (items: PanierItem[]) => {
        const loadPromises = items.map((item) => {
          return new Promise<void>((resolve) => {
            if (!item.bassin && item.bassinId) {
              this.bassinService.consulterBassin(item.bassinId).subscribe({
                next: (bassin) => {
                  item.bassin = bassin;
                  this.updatePromotionStatus(item);
                  resolve();
                },
                error: () => resolve(),
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
          this.lastUpdate = new Date();
          this.checkPromotionsUpdates();
        });
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.errorMessage = 'Impossible de charger votre panier. Veuillez réessayer.';
        this.isLoading = false;
      },
    });
  }

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
    item.tauxReduction = item.bassin.promotion.tauxReduction || 0;

    if (item.promotionActive) {
      item.prixPromo = parseFloat((item.prixOriginal * (1 - item.tauxReduction)).toFixed(2));
    } else {
      item.prixPromo = item.prixOriginal;
    }

    if (wasPromoActive !== item.promotionActive) {
      this.updateSubject.next();
    }
  }

  calculateTotals(): void {
    this.subtotal = this.cartItems.reduce(
      (total, item) => total + this.calculateSubtotal(item),
      0
    );

    this.discount = this.cartItems.reduce((total, item) => {
      if (item.promotionActive && item.prixOriginal) {
        const originalPrice = item.prixOriginal * item.quantity;
        const currentPrice = this.getEffectivePrice(item) * item.quantity;
        return total + (originalPrice - currentPrice);
      }
      return total;
    }, 0);

    this.vatAmount = parseFloat((this.subtotal * this.vatRate).toFixed(2));
    this.total = parseFloat((this.subtotal + this.vatAmount).toFixed(2));
    this.updateSubject.next();
  }

  getEffectivePrice(item: PanierItem): number {
    if (item.isCustomized && item.customProperties?.prixEstime) {
      return item.customProperties.prixEstime;
    }

    if (item.promotionActive && item.tauxReduction !== undefined) {
      return item.prixPromo ?? (item.prixOriginal ?? item.bassin?.prix ?? 0) * (1 - item.tauxReduction);
    }

    return item.prixOriginal ?? item.bassin?.prix ?? 0;
  }

  getDisplayDetails(item: PanierItem): string {
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
    } else if (item.bassin) {
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
    if (!item.promotionActive || item.tauxReduction === undefined) return 0;
    return Math.round(item.tauxReduction * 100);
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
      cancelButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        this.cartService.removeFromCart(item.id).subscribe({
          next: () => {
            this.toastService.showSuccess('Article supprimé du panier');
            this.loadCart();
          },
          error: (error: any) => {
            console.error('Error removing item:', error);
            this.toastService.showError("Erreur lors de la suppression de l'article");
          },
        });
      }
    });
  }
  getLastUpdateTime(): string {
    if (!this.lastUpdate) return '';
    return this.lastUpdate.toLocaleTimeString();
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
              showConfirmButton: false,
            });
            this.loadCart();
          },
          error: (error: any) => {
            console.error('Error clearing cart:', error);
            Swal.fire({
              title: 'Erreur',
              text: 'Une erreur est survenue lors de la suppression des articles. Veuillez réessayer.',
              icon: 'error',
              confirmButtonText: 'OK',
            });
          },
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
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/checkout' },
      });
      this.toastService.showInfo(
        'Veuillez vous connecter ou créer un compte pour finaliser votre commande'
      );
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
    if (
      item.bassin &&
      item.bassin.imagesBassin &&
      item.bassin.imagesBassin.length > 0
    ) {
      const firstImage = item.bassin.imagesBassin[0];
      if (firstImage && firstImage.imagePath) {
        return `${
          this.bassinService.apiURL
        }/imagesBassin/getFS/${encodeURIComponent(firstImage.imagePath)}`;
      }
    }

    // Fallback
    return item.isCustomized
      ? 'assets/default-image.webp'
      : 'assets/default-image.webp';
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
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      if (item.bassin.stock <= 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Rupture de stock',
          text: 'Ce produit est actuellement en rupture de stock',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      if (item.quantity >= item.bassin.stock) {
        await Swal.fire({
          icon: 'warning',
          title: 'Stock insuffisant',
          html: `Vous ne pouvez pas commander plus de <b>${item.bassin.stock}</b> unité(s) de ce produit`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      await this.updateQuantity(item, item.quantity + 1);
    } catch (error) {
      console.error("Erreur lors de l'incrémentation:", error);
      await Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors de la mise à jour de la quantité',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
    }
  }

  public async updateQuantity(
    item: PanierItem,
    newQuantity: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cartService.updateQuantity(item, newQuantity).subscribe({
        next: (updatedItem) => {
          item.quantity = newQuantity;
          this.calculateTotals();
          Swal.fire({
            icon: 'success',
            title: 'Quantité mise à jour',
            showConfirmButton: false,
            timer: 1500,
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
            confirmButtonColor: '#3085d6',
          });
          this.loadCart(); // Recharger les données
          reject(err);
        },
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
      this.toastService.showWarning(
        `Vous ne pouvez pas commander plus de ${availableStock} unités`
      );
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
      imageUrl: this.getImageUrl(item),
    });
  }

  debugPromotions(): void {
    this.cartItems.forEach((item) => {
      if (item.bassin?.promotion) {
        console.log('Détails promotion pour', item.bassin.nomBassin, ':');
        console.log('- Active:', item.promotionActive);
        console.log('- Taux:', item.tauxReduction);
        console.log('- Prix original:', item.prixOriginal);
        console.log('- Prix promo:', item.prixPromo);
        console.log(
          '- Dates:',
          item.bassin.promotion.dateDebut,
          'à',
          item.bassin.promotion.dateFin
        );
      }
    });
  }

  // Dans votre composant CartComponent ou HeaderComponent

  getItemImage(item: PanierItem): string {
    if (item.isCustomized) {
      // Priorité 1: Image de personnalisation
      if (item.customProperties?.imageUrl)
        return item.customProperties.imageUrl;

      // Priorité 2: Image du matériau sélectionné
      if (item.customProperties?.materiau) {
        const materialImage =
          this.materiauxImages[item.customProperties.materiau];
        if (materialImage) return materialImage;
      }

      // Priorité 3: Image du bassin de base
      if (item.customProperties?.bassinBase?.imageUrl) {
        return item.customProperties.bassinBase.imageUrl;
      }

      // Fallback
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

   // Obtient le nom correct de l'item
   getItemName(item: PanierItem): string {
     if (item.isCustomized) {
       return item.customProperties?.bassinBase?.nom
         ? `${item.customProperties.bassinBase.nom} (Personnalisé)`
         : 'Bassin personnalisé';
     }
     return item.bassin?.nomBassin || item.nomBassin || 'Bassin';
   }

  getItemDetails(item: PanierItem): string {
    const details = [];

    if (item.isCustomized) {
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
      if (item.bassin?.dimensions) {
        details.push(
          `Dimensions: ${this.formatDimensions(item.bassin.dimensions)}`
        );
      }
      if (item.bassin?.materiau) {
        details.push(`Matériau: ${this.formatMateriaux(item.bassin.materiau)}`);
      }
      if (item.bassin?.couleur) {
        details.push(`Couleur: ${item.bassin.couleur}`);
      }
    }

    return details.join(' • ') || 'Détails non spécifiés';
  }

  getAccessoriesList(item: PanierItem): string {
    if (!item.isCustomized || !item.customProperties?.accessoires?.length) {
      return 'Aucun accessoire';
    }

    return item.customProperties.accessoires
      .map((acc) => `${acc.nomAccessoire} (${acc.prixAccessoire.toFixed(2)}€)`)
      .join(', ');
  }

  // Obtenir le prix total de tous les accessoires
  getTotalAccessoriesPrice(item: PanierItem): number {
    if (!item.accessoires || item.accessoires.length === 0) return 0;

    return item.accessoires.reduce(
      (total, acc) => total + (acc.prixAccessoire || 0),
      0
    );
  }
  getStatusDisplay(item: PanierItem): string {
    if (item.isCustomized) {
      return 'Personnalisé';
    }
    switch (item.status) {
      case 'DISPONIBLE':
        return 'En stock';
      case 'SUR_COMMANDE':
        return 'Sur commande';
      case 'RUPTURE_STOCK':
        return 'Rupture de stock';
      default:
        return item.bassin?.statut || 'Statut inconnu';
    }
  }
  // Méthode pour obtenir la description du bassin
  getItemDescription(item: PanierItem): string {
    if (item.isCustomized) {
      return `Bassin personnalisé avec ${
        item.customization!.materiauSelectionne || 'matériau standard'
      },
       dimensions ${item.customization!.dimensionSelectionnee || 'standard'}`;
    } else {
      return item.bassin?.description || item.description || '';
    }
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
      if (ctx.fillStyle !== color) {
        // Si le navigateur a reconnu la couleur
        return ctx.fillStyle;
      }
    }

    return '#CCCCCC'; // Couleur par défaut
  }
  // Calcule les suppléments pour les articles personnalisés
  calculateSupplements(item: PanierItem): number {
    if (!item.isCustomized) return 0;

    const materiauPrice = item.customization?.prixMateriau || 0;
    const dimensionPrice = item.customization?.prixDimension || 0;
    const accessoiresPrice = item.prixAccessoires || 0;

    return materiauPrice + dimensionPrice + accessoiresPrice;
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

  // Calculate discount amount for an item
calculateDiscount(item: PanierItem): number {
  if (!item.promotionActive || !item.tauxReduction || !item.prixOriginal) {
    return 0;
  }
  return item.prixOriginal * item.tauxReduction;
}

// Get maximum quantity allowed for an item
getMaxQuantity(item: PanierItem): number {
  // For customized items, no stock limit
  if (item.isCustomized) {
    return 999; // Arbitrary high number
  }
  
  // For standard items, use available stock
  return item.bassin?.stock || 1;
}

// Check if quantity can be incremented
canIncrementQuantity(item: PanierItem): boolean {
  // For customized items, always allow increment
  if (item.isCustomized) {
    return true;
  }
  
  // For standard items, check against stock
  if (item.bassin && item.bassin.stock !== undefined) {
    return item.quantity < item.bassin.stock;
  }
  
  // If stock info not available, allow increment
  return true;
}

// Check if cart has custom items
hasCustomItems(): boolean {
  return this.cartItems.some(item => item.isCustomized);
}

// Get estimated delivery time for custom items
getEstimatedDeliveryTime(): string {
  const customItems = this.cartItems.filter(item => item.isCustomized);
  
  if (customItems.length === 0) {
    return '2-3 jours ouvrables';
  }

  // Find the longest fabrication time
  const maxDays = customItems.reduce((max, item) => {
    const days = item.customization?.dureeFabrication 
      ? parseInt(item.customization.dureeFabrication) 
      : 15; // Default max
    return Math.max(max, days);
  }, 0);

  return maxDays > 0 
    ? `Jusqu'à ${maxDays} jours ouvrables` 
    : '2-3 jours ouvrables';
}

// Redirect to login page
redirectToLogin(): void {
  this.router.navigate(['/login'], {
    queryParams: { returnUrl: this.router.url }
  });
}
}
