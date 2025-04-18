import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Bassin } from '../../../core/models/bassin.models';
import { Categorie } from '../../../core/models/categorie.models';
import { Promotion } from '../../../core/models/promotion.model';
import { BassinService } from '../../../core/services/bassin.service';
import { CategorieService } from '../../../core/services/categorie.service';
import { catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, interval, map, of, Subject, Subscription, takeUntil } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { FavoritesService } from '../../../core/services/favorites.service';
import { ToastService } from '../../../core/services/toast.service';
import { PanierItem } from '../../../core/models/panier-item.model';
import { Panier } from '../../../core/models/panier.model';
import { AuthService } from '../../../core/authentication/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

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
  selectedPrice: number = 1000;
  sortOrder: string = 'asc';
  hoveredProduct: number | null = null;
  showOnlyPromotions: boolean = false;
  showOnlyAvailable: boolean = true;
  isBrowser: boolean;
  timerSubscription: Subscription | null = null;
  activePromotions: Promotion[] = [];
  nextEndingPromotion: Promotion | null = null;
  countdownTime: { days: number, hours: number, minutes: number, seconds: number } = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  cartItems: PanierItem[] = [];
  totalPrice: number = 0;


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
        this.totalPrice = this.calculateTotalPrice(this.cartItems); // Use local calculation
        this.cdr.markForCheck();
      });
  
      if (this.isBrowser) {
        this.startPromotionCountdown();
      }
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

  // Utilisez markForCheck au lieu de detectChanges pour une meilleure performance
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

    this.categories = data.categories;
    this.updateActivePromotions();
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


 
  loadCart(): void {
    this.cartService.getCartItems().subscribe({
      next: (items: PanierItem[]) => {
        this.cartItems = items;
        this.totalPrice = this.cartService.getTotalPrice(items);
      },
      error: (err) => {
        console.error('Erreur lors du chargement du panier:', err);
      }
    });
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

  onPromotionFilterChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.showOnlyPromotions = checkbox.checked;
    this.applyFilters();
  }

  onAvailabilityChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.showOnlyAvailable = checkbox.checked;
    this.applyFilters();
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortOrder = select.value;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredBassins = this.bassins.filter((bassin) => {
      const matchesCategory =
        this.selectedCategories.length === 0 ||
        (bassin.categorie && this.selectedCategories.includes(bassin.categorie.idCategorie));

      const prixEffectif = bassin.prixPromo !== undefined ? bassin.prixPromo : bassin.prix;
      const matchesPrice = prixEffectif <= this.selectedPrice;

      const matchesPromotion = this.showOnlyPromotions
        ? bassin.promotionActive
        : true;

      const matchesAvailability = this.showOnlyAvailable
        ? bassin.disponible && bassin.stock > 0
        : true;

      return matchesCategory && matchesPrice && matchesPromotion && matchesAvailability;
    });

    this.sortBassins();
    this.cdr.detectChanges();
  }

  sortBassins(): void {
    this.filteredBassins.sort((a, b) => {
      if (this.sortOrder === 'promo') {
        if (a.promotionActive && !b.promotionActive) return -1;
        if (!a.promotionActive && b.promotionActive) return 1;
      }

      const prixA = a.prixPromo !== undefined ? a.prixPromo : a.prix;
      const prixB = b.prixPromo !== undefined ? b.prixPromo : b.prix;

      if (this.sortOrder === 'asc') return prixA - prixB;
      if (this.sortOrder === 'desc') return prixB - prixA;

      return 0;
    });
  }

  resetFilters(): void {
    this.selectedCategories = [];
    this.selectedPrice = 1000;
    this.sortOrder = 'asc';
    this.showOnlyPromotions = false;
    this.showOnlyAvailable = true;

    const categoryCheckboxes = document.querySelectorAll('.category-item input[type="checkbox"]');
    categoryCheckboxes.forEach((checkbox: Element) => {
      if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = false;
      }
    });

    const promoFilter = document.getElementById('promo-filter') as HTMLInputElement | null;
    if (promoFilter) {
      promoFilter.checked = false;
    }

    const availabilityFilter = document.getElementById('availability-filter') as HTMLInputElement | null;
    if (availabilityFilter) {
      availabilityFilter.checked = true;
    }

    this.applyFilters();
    this.showNotification('Filtres réinitialisés', 'info');
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/default-image.webp';
  }

  getCategoryName(categoryId?: number): string {
    if (!categoryId) return 'Non catégorisé';
    const category = this.categories.find((cat) => cat.idCategorie === categoryId);
    return category ? category.nomCategorie : 'Non catégorisé';
  }

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

  showDetails(bassin: Bassin, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/bassin-details', bassin.idBassin]);
  }

  setHoveredProduct(id: number | null): void {
    this.hoveredProduct = id;
    this.cdr.detectChanges();
  }

  getPrixOriginal(bassin: Bassin): number {
    return bassin.prix;
  }

  getPrixAvecPromotion(bassin: Bassin): number {
    return bassin.prixPromo || bassin.prix;
  }

  getTauxReduction(bassin: Bassin): number {
    if (bassin.promotion && bassin.promotionActive && bassin.promotion.tauxReduction) {
      return Math.round(bassin.promotion.tauxReduction * 100);
    }
    return 0;
  }

  getAvailabilityStatus(bassin: Bassin): string {
    if (bassin.disponible && bassin.stock > 0) {
      return 'Disponible';
    } else if (bassin.disponible && (!bassin.stock || bassin.stock <= 0)) {
      return 'Rupture de stock';
    } else {
      return 'Indisponible';
    }
  }

  getAvailabilityClass(bassin: Bassin): string {
    if (bassin.disponible && bassin.stock > 0) {
      return 'available';
    } else if (bassin.disponible && (!bassin.stock || bassin.stock <= 0)) {
      return 'out-of-stock';
    } else {
      return 'unavailable';
    }
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    if (!this.isBrowser) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const iconClass = type === 'success'
      ? 'fa-check-circle'
      : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');

    notification.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;

    const container = document.getElementById('notificationContainer');
    if (container) {
      container.appendChild(notification);

      setTimeout(() => {
        notification.classList.add('show');
      }, 10);

      setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }
  }

// Mettre à jour la méthode addToCart
addToCart(bassin: Bassin, event: Event): void {
  event.stopPropagation();
  event.preventDefault();
  
  if (!bassin.disponible || bassin.stock <= 0) {
    this.toastService.showError('Ce bassin n\'est pas disponible actuellement');
    return;
  }

  // Vérifier si le bassin est déjà dans le panier
  const existingItem = this.cartItems.find(item => item.bassinId === bassin.idBassin);
  if (existingItem) {
    // Si oui, vérifier si on peut augmenter la quantité
    if (existingItem.quantity >= bassin.stock) {
      this.toastService.showError(`Quantité maximale atteinte (${bassin.stock})`);
      return;
    }
  }

  this.isLoading = true;
  
  const promotion = bassin.promotionActive ? bassin.promotion : undefined;
  
  this.cartService.addBassinToCart(bassin, 1, promotion).subscribe({
    next: (response: { success: boolean; message?: string; cart?: Panier }) => {
      this.isLoading = false;
      if (response.success) {
        this.toastService.showSuccess(response.message || 'Produit ajouté au panier');
      } else {
        this.toastService.showError(response.message || 'Erreur lors de l\'ajout au panier');
      }
    },
    error: (err) => {
      this.isLoading = false;
      this.handleCartError(err);
    }
  });
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

handleImageError(event: any) {
  event.target.src = 'assets/default-image.webp';
  event.target.onerror = null; // Empêche les boucles d'erreur
}
}