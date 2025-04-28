import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Bassin } from '../../../core/models/bassin.models';
import { Categorie } from '../../../core/models/categorie.models';
import { Promotion } from '../../../core/models/promotion.model';
import { BassinService } from '../../../core/services/bassin.service';
import { CategorieService } from '../../../core/services/categorie.service';
import { catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, interval, lastValueFrom, map, of, Subject, Subscription, takeUntil, timeout } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { FavoritesService } from '../../../core/services/favorites.service';
import { ToastService } from '../../../core/services/toast.service';
import { PanierItem } from '../../../core/models/panier-item.model';
import { Panier } from '../../../core/models/panier.model';
import { AuthService } from '../../../core/authentication/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-shop-page',
  templateUrl: './shop-page.component.html',
  styleUrls: ['./shop-page.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
    trigger('cardAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
    ]),
    trigger('staggerAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger('50ms', animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })))
        ], { optional: true })
      ])
    ]),
  ],
})
export class ShopPageComponent implements OnInit, OnDestroy {
  bassins: Bassin[] = [];
  categories: Categorie[] = [];
  filteredBassins: Bassin[] = [];
  selectedCategories: number[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  minPrice: number = 0;
  maxPrice: number = 5000;
  selectedPrice: number = this.maxPrice;
  sortOrder: string = 'asc';
  hoveredProduct: number | null = null;
  showOnlyPromotions: boolean = false;
  showAvailable: boolean = true;
  showOnOrder: boolean = true;
  isBrowser: boolean;
  timerSubscription: Subscription | null = null;
  activePromotions: Promotion[] = [];
  nextEndingPromotion: Promotion | null = null;
  countdownTime: { days: number, hours: number, minutes: number, seconds: number } = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  cartItems: PanierItem[] = [];
  totalPrice: number = 0;

  currentPage: number = 1;
  itemsPerPage: number = 9; // 3 lignes de 3 produits
  pagedBassins: Bassin[] = [];
  startIndex: number = 0;
  endIndex: number = 0;
  totalPages: number = 0;
  

showFiltersMobile: boolean = false;


  private dataSubscription: Subscription | null = null;
  private cartSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  
  constructor(
    private bassinService: BassinService,
    private categorieService: CategorieService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private favoritesService: FavoritesService,
    private toastService: ToastService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadData();
    
    this.cartSubscription = this.cartService.panier$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev?.items) === JSON.stringify(curr?.items)),
      debounceTime(100)
    ).subscribe(panier => {
      this.cartItems = panier?.items || [];
      this.totalPrice = this.calculateTotalPrice(this.cartItems);
      this.cdr.markForCheck();
    });

    if (this.isBrowser) {
      this.startPromotionCountdown();
    }
  }
  startPromotionCountdown(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }

    this.timerSubscription = interval(1000).subscribe(() => {
      this.updateCountdown();
      this.cdr.detectChanges();
    });
  }

  

  onCategoryChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const categoryId = +checkbox.value;

    if (checkbox.checked) {
      this.selectedCategories.push(categoryId);
    } else {
      this.selectedCategories = this.selectedCategories.filter(id => id !== categoryId);
    }

    this.applyFilters();
  }

  private calculateTotalPrice(items: PanierItem[]): number {
    return items.reduce((total, item) => {
      const quantity = item.quantity || 1;
      let itemPrice = item.effectivePrice || item.prixOriginal || 0;
      
      if (item.promotionActive && item.tauxReduction) {
        const reduction = Number(item.tauxReduction) / 100;
        itemPrice *= (1 - reduction);
      }
      
      return total + (itemPrice * quantity);
    }, 0);
  }

  private updateCountdown(): void {
    if (!this.nextEndingPromotion || !this.nextEndingPromotion.dateFin) return;

    const now = new Date().getTime();
    const endTime = new Date(this.nextEndingPromotion.dateFin).getTime();
    const timeLeft = endTime - now;

    if (timeLeft <= 0) {
      this.loadData();
      return;
    }

    this.countdownTime = {
      days: Math.floor(timeLeft / (1000 * 60 * 60 * 24)),
      hours: Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((timeLeft % (1000 * 60)) / 1000)
    };

    this.cdr.markForCheck();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    this.dataSubscription = forkJoin({
      bassins: this.bassinService.listeBassin().pipe(
        catchError(err => {
          console.error('Error loading bassins:', err);
          return of([] as Bassin[]);
        })
      ),
      categories: this.categorieService.listeCategories().pipe(
        catchError(err => {
          console.error('Error loading categories:', err);
          return of([] as Categorie[]);
        })
      ),
      promotions: this.bassinService.listeBassinsAvecPromotions().pipe(
        catchError(err => {
          console.error('Error loading promotions:', err);
          return of([] as Bassin[]);
        })
      )
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (data: {bassins: Bassin[], categories: Categorie[], promotions: Bassin[]}) => {
        this.processData(data);
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.errorMessage = 'Erreur lors du chargement des données';
        this.cdr.markForCheck();
      }
    });
  }

  private processData(data: any): void {
    this.bassins = data.bassins.map((bassin: Bassin) => {
      const bassinAvecPromo = data.promotions.find((p: Bassin) => p.idBassin === bassin.idBassin);
      if (bassinAvecPromo?.promotionActive) {
        bassin.promotion = bassinAvecPromo.promotion;
        bassin.promotionActive = true;
        bassin.prixPromo = this.bassinService.calculerPrixAvecPromotion(bassin);
      } else {
        bassin.promotionActive = false;
        bassin.prixPromo = bassin.prix;
      }
      bassin.isFavorite = this.favoritesService.isInFavorites(bassin.idBassin);
      return bassin;
    });

    // Calculate max price for price range
    if (this.bassins.length > 0) {
      this.maxPrice = Math.max(...this.bassins.map(b => 
        b.promotionActive ? b.prixPromo || 0 : b.prix
      ));
      this.selectedPrice = this.maxPrice;
    }

    this.categories = data.categories.map((cat: Categorie) => ({
      ...cat,
      selected: false
    }));
    
    this.updateActivePromotions();
  }

  updateActivePromotions(): void {
    const now = new Date();
    const uniquePromotions = new Map<number, Promotion>();
  
    this.bassins.forEach(bassin => {
      if (bassin.promotion && 
          bassin.promotionActive && 
          bassin.promotion.idPromotion !== undefined &&
          bassin.promotion.dateFin) { // Ensure dateFin exists
        
        const promoId = bassin.promotion.idPromotion;
        if (!uniquePromotions.has(promoId)) {
          uniquePromotions.set(promoId, bassin.promotion);
        }
      }
    });
  
    this.activePromotions = Array.from(uniquePromotions.values())
      .filter(p => p.dateFin) // Filter out promotions without dateFin
      .sort((a, b) => {
        // Use optional chaining and nullish coalescing
        const dateA = a.dateFin ? new Date(a.dateFin).getTime() : 0;
        const dateB = b.dateFin ? new Date(b.dateFin).getTime() : 0;
        return dateA - dateB;
      });
  
    this.nextEndingPromotion = this.activePromotions.length > 0 ? this.activePromotions[0] : null;
  
    if (this.nextEndingPromotion) {
      this.updateCountdown();
    }
  }

  updatePriceRange(type: 'min' | 'max'): void {
    if (type === 'min' && this.minPrice > this.selectedPrice) {
      this.minPrice = this.selectedPrice;
    }
    if (type === 'max' && this.selectedPrice < this.minPrice) {
      this.selectedPrice = this.minPrice;
    }
    this.applyFilters();
  }


  async addToCart(bassin: Bassin, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    
    // Vérification du statut
    if (bassin.statut !== 'DISPONIBLE' && bassin.statut !== 'SUR_COMMANDE') {
      await Swal.fire({
        title: 'Indisponible',
        text: 'Ce bassin n\'est pas disponible actuellement',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
  
    try {
      this.isLoading = true;
      
      // Pour les bassins standard, vérifier s'il est déjà dans le panier
      const existingItem = this.cartItems.find(item => 
        item.bassinId === bassin.idBassin && !item.isCustomized
      );
      
      if (existingItem) {
        // Gestion des quantités pour les bassins standard
        if (bassin.statut === 'SUR_COMMANDE' && existingItem.quantity >= 1) {
          await Swal.fire({
            title: 'Limite atteinte',
            text: 'Vous ne pouvez commander qu\'un seul bassin sur commande',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          return;
        }
        
        if (bassin.statut === 'DISPONIBLE' && existingItem.quantity >= bassin.stock) {
          await Swal.fire({
            title: 'Stock limité',
            text: `Quantité maximale disponible : ${bassin.stock}`,
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          return;
        }
      }
  
      const promotion = bassin.promotionActive ? bassin.promotion : undefined;
      
      await lastValueFrom(
        this.cartService.addBassinToCart(bassin, 1, promotion).pipe(timeout(3000))
      );
  
      await Swal.fire({
        title: 'Ajouté au panier !',
        text: 'Le bassin a bien été ajouté à votre panier',
        icon: 'success',
        showConfirmButton: true,
        confirmButtonText: 'Voir mon panier',
        showCancelButton: true,
        cancelButtonText: 'Continuer mes achats',
        timer: 3000
      });
      
    } catch (error) {
      console.error('Erreur:', error);
      await Swal.fire({
        title: 'Oups !',
        text: 'Une erreur est survenue lors de l\'ajout au panier',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      this.isLoading = false;
    }
  }

  private handleCartError(err: any): void {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        this.toastService.showError('Impossible de se connecter au serveur');
      } else {
        this.toastService.showError(err.error?.message || 'Erreur lors de l\'opération panier');
      }
    } else {
      this.toastService.showError('Erreur inconnue');
    }
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  /****
   * *******
   * ******
   * 
   * ********
   * 
   */
  // Méthode pour réinitialiser tous les filtres
  resetFilters(): void {
    this.minPrice = 0;
    this.selectedPrice = this.maxPrice;
    this.sortOrder = 'asc';
    this.showOnlyPromotions = false;
    this.showAvailable = true;
    this.showOnOrder = true;
  
    // Réinitialiser les sélections de catégories
    this.categories.forEach(cat => cat.selected = false);
    this.selectedCategories = [];
  
    this.applyFilters();
    this.toastService.showInfo('Filtres réinitialisés');
  }

// Méthode pour gérer le changement de tri
onSortChange(event: Event): void {
  const select = event.target as HTMLSelectElement;
  this.sortOrder = select.value;
  this.applyFilters();
}

// Méthode pour gérer le survol d'un produit
setHoveredProduct(id: number | null): void {
  this.hoveredProduct = id;
  this.cdr.detectChanges();
}

// Méthode pour afficher les détails d'un produit
showDetails(bassin: Bassin, event?: Event): void {
  if (event) {
    event.stopPropagation();
  }
  this.router.navigate(['/bassin-details', bassin.idBassin]);
}

// Méthode pour obtenir le taux de réduction
getTauxReduction(bassin: Bassin): number {
  if (bassin.promotion && bassin.promotionActive && bassin.promotion.tauxReduction) {
    return Math.round(bassin.promotion.tauxReduction * 100);
  }
  return 0;
}

// Méthode pour obtenir le statut de disponibilité
getAvailabilityStatus(bassin: Bassin): string {
  if (bassin.statut === 'DISPONIBLE') {
    return 'Disponible';
  } else if (bassin.statut === 'SUR_COMMANDE') {
    return 'Sur Commande';
  } else {
    return 'Indisponible';
  }
}

// Méthode pour gérer les erreurs d'image
handleImageError(event: any): void {
  const imgElement = event.target as HTMLImageElement;
  imgElement.src = 'assets/default-image.webp';
  imgElement.onerror = null; // Empêcher les boucles d'erreur
}

// Méthode pour obtenir le nom de la catégorie
getCategoryName(categoryId?: number): string {
  if (!categoryId) return 'Non catégorisé';
  const category = this.categories.find(cat => cat.idCategorie === categoryId);
  return category ? category.nomCategorie : 'Non catégorisé';
}

// Méthode pour obtenir le prix avec promotion
getPrixAvecPromotion(bassin: Bassin): number {
  return bassin.prixPromo || bassin.prix;
}

// Méthode pour obtenir le prix original
getPrixOriginal(bassin: Bassin): number {
  return bassin.prix;
}

// Méthode pour ajouter aux favoris
addToFavorites(bassin: Bassin, event: Event): void {
  event.stopPropagation();
  
  if (bassin.isFavorite) {
    this.favoritesService.removeFromFavorites(bassin.idBassin);
    bassin.isFavorite = false;
    this.toastService.showInfo('Retiré des favoris');
  } else {
    this.favoritesService.addToFavorites(bassin);
    bassin.isFavorite = true;
    this.toastService.showSuccess('Ajouté aux favoris');
  }
  
  this.cdr.detectChanges();
}

// Méthode pour appliquer les filtres (version améliorée)
applyFilters(): void {


  this.selectedCategories = this.categories
  .filter(cat => cat.selected)
  .map(cat => cat.idCategorie);

this.filteredBassins = this.bassins.filter(bassin => {
  //  // Filtrer par prix
    const price = bassin.promotionActive ? bassin.prixPromo : bassin.prix;
    if (price === undefined || price < this.minPrice || price > this.selectedPrice) {
      return false;
    }

    // Filtrer par statut
    const isAvailable = this.showAvailable && bassin.statut === 'DISPONIBLE';
    const isOnOrder = this.showOnOrder && bassin.statut === 'SUR_COMMANDE';
    if (!isAvailable && !isOnOrder) {
      return false;
    }

    // Filtrer par promotion
    if (this.showOnlyPromotions && !bassin.promotionActive) {
      return false;
    }

    // Filtrer par catégorie
    if (this.selectedCategories.length > 0 && 
        bassin.categorie && 
        !this.selectedCategories.includes(bassin.categorie.idCategorie)) {
      return false;
    }
 // Filtrer par catégorie
 if (this.selectedCategories.length > 0 && 
  bassin.categorie && 
  !this.selectedCategories.includes(bassin.categorie.idCategorie)) {
return false;
}

return true;
});

  this.currentPage = 1; // Réinitialiser à la première page
  this.updatePagination();

  this.sortBassins();
}

// Méthode pour trier les bassins
sortBassins(): void {
  this.filteredBassins.sort((a, b) => {
    const priceA = (a.promotionActive ? a.prixPromo : a.prix) || 0;
    const priceB = (b.promotionActive ? b.prixPromo : b.prix) || 0;

    if (this.sortOrder === 'asc') return priceA - priceB;
    if (this.sortOrder === 'desc') return priceB - priceA;
    if (this.sortOrder === 'promo') {
      if (a.promotionActive && !b.promotionActive) return -1;
      if (!a.promotionActive && b.promotionActive) return 1;
      return 0;
    }
    return 0;
  });
}


updatePagination(): void {
  this.totalPages = Math.ceil(this.filteredBassins.length / this.itemsPerPage);
  this.startIndex = (this.currentPage - 1) * this.itemsPerPage;
  this.endIndex = Math.min(this.startIndex + this.itemsPerPage, this.filteredBassins.length);
  this.pagedBassins = this.filteredBassins.slice(this.startIndex, this.endIndex);
}
setPage(page: number): void {
  if (page >= 1 && page <= this.totalPages) {
    this.currentPage = page;
    this.updatePagination();
  }
}

previousPage(): void {
  if (this.currentPage > 1) {
    this.currentPage--;
    this.updatePagination();
  }
}

nextPage(): void {
  if (this.currentPage < this.totalPages) {
    this.currentPage++;
    this.updatePagination();
  }
}

getPages(): number[] {
  const pages = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = startPage + maxVisiblePages - 1;

  if (endPage > this.totalPages) {
    endPage = this.totalPages;
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return pages;
}

// Méthode pour afficher/masquer les filtres sur mobile
toggleFilters(): void {
  this.showFiltersMobile = !this.showFiltersMobile;
}


/*******
 * 
 * Image Bassin
 */

 // Méthode pour gérer les erreurs d'images
// Méthode pour obtenir l'URL de l'image d'un bassin
getBassinImageUrl(bassin: Bassin): string {
  if (!bassin) return 'assets/default-image.webp';
  
  // Vérification complète de l'image
  if (bassin.imagesBassin && bassin.imagesBassin.length > 0) {
    const firstImage = bassin.imagesBassin[0];
    if (firstImage && firstImage.imagePath) {
      return `${this.bassinService.apiURL}/imagesBassin/getFS/${encodeURIComponent(firstImage.imagePath)}`;
    }
  }
  
  // Fallback
  return 'assets/default-image.webp';
}

// Méthode pour obtenir le nom d'un bassin
getBassinName(bassin: Bassin): string {
  return bassin?.nomBassin || 'Bassin';
}
onImageError(event: any): void {
  event.target.src = 'assets/default-image.webp'; // Image par défaut
}
}