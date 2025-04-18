import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Bassin } from '../../../core/models/bassin.models';
import { FavoritesService } from '../../../core/services/favorites.service';
import { CartService } from '../../../core/services/cart.service';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { Promotion } from '../../../core/models/promotion.model';
import { Panier } from '../../../core/models/panier.model';

@Component({
  selector: 'app-favorites-page',
  templateUrl: './favorites-page.component.html',
  styleUrls: ['./favorites-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(80, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-in', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class FavoritesPageComponent implements OnInit {
  favorites: Bassin[] = [];
  hoveredProduct: number | null = null;

  constructor(
    private favoritesService: FavoritesService,
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadFavorites();
    
    this.favoritesService.favorites$.subscribe(favorites => {
      this.favorites = favorites;
      this.cdr.detectChanges();
    });
  }

  loadFavorites(): void {
    this.favorites = this.favoritesService.getFavorites();
  }

  removeFromFavorites(bassin: Bassin, event: Event): void {
    event.stopPropagation();
    this.favoritesService.removeFromFavorites(bassin.idBassin);
    this.showNotification('Retiré des favoris', 'info');
  }

  addToCart(bassin: Bassin, event: Event): void {
    event.stopPropagation();
    
    if (!bassin.disponible || bassin.stock <= 0) {
      this.showNotification('Ce produit n\'est pas disponible', 'error');
      return;
    }
  
    // Vérifier la quantité déjà dans le panier
    this.cartService.getCartItems().subscribe(items => {
      const currentInCart = items
        .filter(item => item.bassinId === bassin.idBassin)
        .reduce((sum, item) => sum + item.quantity, 0);
  
      if (currentInCart >= bassin.stock) {
        this.showNotification(`Quantité maximale atteinte (${bassin.stock} disponibles)`, 'error');
        return;
      }
  
      const promotion = bassin.promotionActive ? bassin.promotion : undefined;
  
      this.cartService.addBassinToCart(bassin, 1, promotion).subscribe({
        next: (response: { success: boolean; message?: string; cart?: Panier }) => {
          if (response.success) {
            this.showNotification(response.message || 'Produit ajouté au panier', 'success');
          } else {
            this.showNotification(response.message || 'Erreur lors de l\'ajout au panier', 'error');
          }
        },
        error: (error: Error) => {
          console.error('Erreur lors de l\'ajout au panier', error);
          this.showNotification('Erreur lors de l\'ajout au panier', 'error');
        }
      });
    });
  }

  navigateToProductDetails(bassin: Bassin): void {
    this.router.navigate(['/bassin-details', bassin.idBassin]);
  }

  navigateToShop(): void {
    this.router.navigate(['/shop']);
  }

  setHoveredProduct(id: number | null): void {
    this.hoveredProduct = id;
    this.cdr.detectChanges();
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <i class="fas ${
        type === 'success' ? 'fa-check-circle' : 
        type === 'info' ? 'fa-info-circle' : 'fa-times-circle'
      }"></i> ${message}
    `;
    
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
}