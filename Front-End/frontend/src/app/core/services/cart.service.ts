import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, forkJoin, interval, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, map, tap, switchMap, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Bassin } from '../models/bassin.models';
import { ToastService } from './toast.service';
import { Panier, PanierItem } from '../models/panier.model';
import { Promotion } from '../models/promotion.model';
import { PanierItemRequest } from '../models/panier-item.model';
import { AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  apiUrl = 'http://localhost:8090/orders/api/panier';
  
  // Configuration
  private readonly CART_EXPIRATION_DAYS = 2;
  private readonly LOCAL_CART_KEY = 'local_cart_v2';
  private readonly SESSION_ID_KEY = 'session_id';
  
  // État du panier
  private panierSubject = new BehaviorSubject<Panier>(this.getInitialCart());
  public panier$ = this.panierSubject.asObservable();
  
  private sessionId: string = '';
  private isInitialized = false;
  private pendingRequests = 0;
  private promotionCheckInterval = 60000; 

  private destroy$ = new Subject<void>();
  
  
  constructor(
    private authState: AuthStateService,
    private http: HttpClient,
    private toastService: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loadInitialCart();
    this.setupAuthSubscription();
    this.checkPromotionsInRealTime(); 
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public cleanup(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ========== PUBLIC API ==========

  /**
   * Ajoute un bassin au panier avec tous les détails nécessaires
   */
  addBassinToCart(
    bassin: Bassin, 
    quantity: number, 
    promotion?: Promotion,
    isCustomized: boolean = false,
    customProperties?: any
  ): Observable<{ success: boolean; message?: string; cart?: Panier }> {
    // Input validation
    if (!bassin || quantity <= 0) {
      return of({ success: false, message: 'Paramètres invalides' });
    }
  
    // Stock verification for non-customized products
    if (!isCustomized && (!bassin.stock || bassin.stock <= 0)) {
      return of({ success: false, message: 'Ce produit est en rupture de stock' });
    }
  
    if (!isCustomized && bassin.stock < quantity) {
      return of({ 
        success: false, 
        message: `Stock insuffisant. Quantité disponible: ${bassin.stock}` 
      });
    }
  
    // Ensure we have a session ID for anonymous users
    const sessionId = this.getOrCreateSessionId();
    if (!this.authState.isLoggedIn && !sessionId) {
      return of({ success: false, message: 'Session error - please refresh the page' });
    }
  
    // Prepare request with complete information
    const request: PanierItemRequest = {
      bassinId: bassin.idBassin,
      quantity: quantity,
      prixOriginal: isCustomized && customProperties?.prixEstime 
        ? customProperties.prixEstime 
        : bassin.prix,
      isCustomized: isCustomized,
      sessionId: sessionId,
      userId: this.authState.currentUserId,
      userEmail: this.authState.currentUserEmail,
      customProperties: isCustomized ? {
        ...customProperties,
        imageUrl: customProperties?.imageUrl || this.extractFirstImageUrl(bassin)
      } : undefined
    };
  
    // Add promotion info if applicable
    if (promotion) {
      request.promotionId = promotion.idPromotion;
      request.nomPromotion = promotion.nomPromotion;
      request.tauxReduction = promotion.tauxReduction;
    }
  
    // Optimistic UI update with complete item details
    const optimisticItem = this.createOptimisticItem(bassin, quantity, isCustomized, customProperties, promotion);
    const currentCart = this.panierSubject.getValue();
    const optimisticCart = this.addItemToLocalCart(currentCart, optimisticItem);
    this.panierSubject.next(optimisticCart);
    this.pendingRequests++;
  
    // Send to server
    return this.http.post<any>(`${this.apiUrl}/items`, request, { 
      headers: this.getHeaders(),
      observe: 'response'
    }).pipe(
      tap(response => {
        // Check for session ID in response headers
        const newSessionId = response.headers.get('X-Session-ID');
        if (newSessionId) {
          this.updateSessionId(newSessionId);
        }
        
        const responseBody = response.body;
        if (responseBody?.success) {
          const updatedCart = responseBody.panier || responseBody.cart;
          
          // Ensure all items have proper image and detail information
          if (updatedCart?.items) {
            updatedCart.items.forEach((item: PanierItem) =>{
              this.enrichItemWithDetails(item, bassin);
            });
          }
          
          this.panierSubject.next(updatedCart);
          this.saveLocalCartWithExpiration(updatedCart);
          this.toastService.showSuccess('Article ajouté au panier');
        }
      }),
      map(response => ({
        success: response.body.success,
        message: response.body.message,
        cart: response.body.panier || response.body.cart
      })),
      catchError(error => {
        // Restore previous cart on error
        this.panierSubject.next(currentCart);
        
        // For anonymous users, try to save locally as fallback
        if (!this.authState.isLoggedIn && isPlatformBrowser(this.platformId)) {
          this.saveLocalCartWithExpiration(currentCart);
        }
        
        return this.handleCartError(error, 'Erreur lors de l\'ajout au panier');
      }),
      finalize(() => this.pendingRequests--)
    );
  }

  /**
   * Supprime un bassin du panier
   */
  removeFromCart(itemId: number): Observable<boolean> {
    // Optimistic update
    const currentCart = this.panierSubject.getValue();
    const updatedCart = this.removeItemFromLocalCart(currentCart, itemId);
    this.panierSubject.next(updatedCart);
    this.pendingRequests++;
    
    return this.http.delete<{success: boolean}>(`${this.apiUrl}/items/${itemId}`, {
        headers: this.getHeaders()
    }).pipe(
        map(response => response.success),
        tap(success => {
          if (success) {
            this.toastService.showSuccess('Article supprimé du panier');
            if (isPlatformBrowser(this.platformId)) {
              this.saveLocalCartWithExpiration(updatedCart);
            }
          }
        }),
        catchError(error => {
            // Restore previous cart
            this.panierSubject.next(currentCart);
            
            if (error.status === 401) {
                this.authState.logout();
                return of(false);
            }
            
            // Fallback for anonymous users
            if (!this.authState.isLoggedIn && isPlatformBrowser(this.platformId)) {
              this.saveLocalCartWithExpiration(updatedCart);
              return of(true);
            }
            
            return of(false);
        }),
        finalize(() => this.pendingRequests--)
    );
  }

  /**
   * Met à jour la quantité d'un article
   */
  updateQuantity(item: PanierItem, newQuantity: number): Observable<boolean> {
    if (newQuantity <= 0) {
      return this.removeFromCart(item.id!);
    }

    // Vérification du stock
    if (!item.isCustomized && item.bassin && item.bassin.stock < newQuantity) {
      this.toastService.showError(`Stock limité à ${item.bassin.stock} unités pour ce produit`);
      return of(false);
    }

    // Mise à jour optimiste
    const currentCart = this.panierSubject.getValue();
    const optimisticCart = this.updateQuantityInLocalCart(currentCart, item.id!, newQuantity);
    this.panierSubject.next(optimisticCart);
    this.pendingRequests++;

    // Mise à jour sur le serveur
    return this.http.put<{ success: boolean }>(
      `${this.apiUrl}/items/${item.id}`,
      { quantity: newQuantity },
      { headers: this.getHeaders() }
    ).pipe(
      switchMap(response => {
        if (response.success) {
          return this.getServerCart().pipe(
            map(() => true),
            tap(() => this.toastService.showSuccess('Quantité mise à jour'))
          );
        }
        return of(false);
      }),
      catchError(error => {
        // Restaurer le panier précédent
        this.panierSubject.next(currentCart);
        console.error('Error updating quantity:', error);
        this.toastService.showError(error.error?.message || 'Erreur lors de la mise à jour');
        
        // Fallback local pour utilisateurs anonymes
        if (!this.authState.isLoggedIn && isPlatformBrowser(this.platformId)) {
          const cart = this.getLocalCart();
          const updatedCart = this.updateQuantityInLocalCart(cart, item.id!, newQuantity);
          this.saveLocalCartWithExpiration(updatedCart);
          this.panierSubject.next(updatedCart);
          return of(true);
        }
        
        return of(false);
      }),
      finalize(() => this.pendingRequests--)
    );
  }

  /**
   * Vide le panier
   */
  clearCart(): Observable<boolean> {
    // Optimistic update
    const currentCart = this.panierSubject.getValue();
    const emptyCart = this.createEmptyCart();
    this.panierSubject.next(emptyCart);
    this.pendingRequests++;

    return this.http.delete<{ success: boolean }>(
      this.apiUrl,
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem(this.LOCAL_CART_KEY);
          if (!this.authState.isLoggedIn) {
            // Pour les utilisateurs anonymes, garder le sessionId
            this.saveLocalCartWithExpiration(emptyCart);
          }
        }
        this.toastService.showSuccess('Panier vidé avec succès');
      }),
      map(response => response.success),
      catchError(error => {
        // Restaurer le panier précédent
        this.panierSubject.next(currentCart);
        console.error('Error clearing cart:', error);
        this.toastService.showError('Erreur lors de la suppression du panier');
        
        // Fallback pour utilisateurs anonymes
        if (!this.authState.isLoggedIn && isPlatformBrowser(this.platformId)) {
          localStorage.removeItem(this.LOCAL_CART_KEY);
          this.panierSubject.next(this.createEmptyCart());
          return of(true);
        }
        
        return of(false);
      }),
      finalize(() => this.pendingRequests--)
    );
  }

  /**
   * Migre le panier de session vers le panier utilisateur après connexion
   */
  migrateSessionCartToUser(): Observable<Panier | null> {
    if (!isPlatformBrowser(this.platformId)) {
        return of(null);
    }

    const sessionId = localStorage.getItem(this.SESSION_ID_KEY);
    if (!sessionId) {
        return this.loadUserCart();
    }

    if (!this.authState?.isLoggedIn) {
        return of(null);
    }
    
    this.pendingRequests++;
    return this.http.post<any>(
        `${this.apiUrl}/migrate`, 
        null,
        { 
            headers: this.getHeaders(),
            observe: 'response'
        }
    ).pipe(
      map(response => {
        const panier = response.body?.panier || response.body?.cart as Panier;
        if (panier?.items) {
            panier.items.forEach((item: PanierItem) => this.enrichItemWithDetails(item));
        }
        return panier;
    }),
        tap(panier => {
            if (panier) {
                localStorage.removeItem(this.SESSION_ID_KEY);
                this.panierSubject.next(panier);
                this.toastService.showSuccess('Votre panier a été récupéré');
            }
        }),
        catchError(error => {
            console.error('Migration error:', error);
            this.toastService.showError('Erreur lors de la récupération du panier');
            return this.loadUserCart();
        }),
        finalize(() => this.pendingRequests--)
    );
}

  /**
   * Synchronise le panier local avec le panier serveur après connexion
   */
  syncCartAfterLogin(): Observable<Panier> {
    if (!isPlatformBrowser(this.platformId)) {
      return this.getServerCart();
    } 
    
    const localCart = this.getLocalCart();
    const hasLocalItems = localCart.items?.length > 0;
    
    if (!hasLocalItems) {
      return this.getServerCart();
    }
    
    // Tenter la migration via API
    const sessionId = localStorage.getItem(this.SESSION_ID_KEY);
    if (sessionId) {
      return this.migrateSessionCartToUser().pipe(
        switchMap(result => result ? of(result) : this.migrateItemsIndividually(localCart)),
        catchError(() => this.migrateItemsIndividually(localCart))
      );
    }
    
    // Si pas de sessionId, migrer article par article
    return this.migrateItemsIndividually(localCart).pipe(
      tap(() => {
        localStorage.removeItem(this.LOCAL_CART_KEY);
      }),
      catchError(() => this.getServerCart())
    );
  }

  /**
   * Récupère les articles du panier sous forme d'Observable
   */
  public getCartItems(): Observable<PanierItem[]> {
    return this.panier$.pipe(
      map(panier => panier?.items || []),
      distinctUntilChanged((prev, next) => JSON.stringify(prev) === JSON.stringify(next))
    );
  }

  /**
   * Vérifie si une opération est en cours
   */
  public get isLoading(): boolean {
    return this.pendingRequests > 0;
  }

  // ========== UTILITY METHODS ==========
  
  /**
   * Formate l'affichage du pourcentage de réduction
   */
  public formatReductionPercentage(tauxReduction?: number): string {
    if (!tauxReduction) return '0%';
    
    // Fix: Ensure we're displaying the actual percentage (42% not 0.42%)
    // No division by 100 as the model already stores the percentage value
    return `${tauxReduction}%`;
  }
  
  /**
   * Extrait la première URL d'image d'un bassin
   */
  private extractFirstImageUrl(bassin?: Bassin): string {
    if (!bassin?.imagesBassin?.length) return '';
    
    const firstImage = bassin.imagesBassin[0];
    return firstImage.imagePath || '';
  }
  
  /**
   * Enrichit un article avec des détails supplémentaires
   */
  private enrichItemWithDetails(item: PanierItem, bassin?: Bassin): void {
    // Si pas d'item ou déjà tous les détails, ne rien faire
    if (!item) return;
    
    const sourceBassin = bassin || item.bassin;
    
    if (!item.isCustomized && sourceBassin) {
        if (!item.nomBassin && sourceBassin.nomBassin) {
            item.nomBassin = sourceBassin.nomBassin;
        }
      
        if (!item.bassinId && sourceBassin.idBassin) {
          item.bassinId = sourceBassin.idBassin;
      }
      
      // Enrichir avec les attributs standards
      if (!item.dimensions && sourceBassin.dimensions) {
        item.dimensions = sourceBassin.dimensions;
      }
      
      if (!item.materiau && sourceBassin.materiau) {
        item.materiau = sourceBassin.materiau;
      }
      
      if (!item.couleur && sourceBassin.couleur) {
        item.couleur = sourceBassin.couleur;
      }
      
      // Assurer la présence d'une image
      if (!item.imageUrl && sourceBassin.imagesBassin?.length) {
        item.imageUrl = this.extractFirstImageUrl(sourceBassin);
      }
    }
    // Pour les bassins personnalisés
    else if (item.isCustomized) {
      if (!item.customProperties) {
          item.customProperties = {};
      }
      
      // Ensure all custom properties are properly set
      if (item.customProperties.couleurSelectionnee) {
          item.couleur = item.customProperties.couleurSelectionnee;
      }
      if (item.customProperties.materiauSelectionne) {
        item.materiau = item.customProperties.materiauSelectionne;
      }
      
      if (item.customProperties.dimensionSelectionnee) {
        item.dimensions = item.customProperties.dimensionSelectionnee;
      }
      
      // Assurer la présence d'une image pour le bassin personnalisé
      if (!item.customProperties.imageUrl && sourceBassin) {
        item.customProperties.imageUrl = this.extractFirstImageUrl(sourceBassin);
      }
      
      if (!item.imageUrl && item.customProperties.imageUrl) {
        item.imageUrl = item.customProperties.imageUrl;
      }
    }
    
    // Calculer les prix effectifs
    this.calculateEffectivePrice(item);
  }
  

/**
 * Calcule le prix effectif en tenant compte des promotions
 */
calculateEffectivePrice(item: PanierItem): void {
  if (!item) return;
  
  const originalPrice = item.prixOriginal || 0;
  
  if (item.promotionActive && item.tauxReduction) {
    // Si tauxReduction est 0.65 (65%), on le multiplie directement
    item.effectivePrice = originalPrice * (1 - item.tauxReduction);
    // Arrondir à 2 décimales pour éviter les erreurs d'arrondi
    item.effectivePrice = Math.round(item.effectivePrice * 100) / 100;
  } else {
    item.effectivePrice = originalPrice;
  }
}
  // ========== PRIVATE METHODS ==========

  private getInitialCart(): Panier {
    return {
      id: -1,
      items: [],
      totalPrice: 0,
      userId: undefined,
      sessionId: undefined
    };
  }

  private createEmptyCart(): Panier {
    const isLoggedIn = this.authState?.isLoggedIn ?? false;
    const userId = isLoggedIn ? (this.authState.currentUserId ?? undefined) : undefined;

    return {
      id: -1,
      items: [],
      totalPrice: 0,
      userId: userId,
      sessionId: !isLoggedIn && isPlatformBrowser(this.platformId) 
        ? localStorage.getItem(this.SESSION_ID_KEY) || undefined 
        : undefined
    };
  }

// Update your getHeaders() method in CartService
private getHeaders(): HttpHeaders {
  let headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  // Ajout conditionnel du token JWT
  const token = this.authState.currentToken;
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  // Ajout du session ID pour les utilisateurs non connectés
  const sessionId = this.getOrCreateSessionId();
  if (!this.authState.isLoggedIn && sessionId) {
    headers = headers.set('X-Session-ID', sessionId);
  }

  return headers;
}

  private getOrCreateSessionId(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }
  
    // Check if we already have a session ID in memory
    if (this.sessionId) {
      return this.sessionId;
    }
  
    // Try to get from localStorage
    this.sessionId = localStorage.getItem(this.SESSION_ID_KEY) || '';
    
    // If still empty, generate new one
    if (!this.sessionId) {
      this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(this.SESSION_ID_KEY, this.sessionId);
    }
    
    return this.sessionId;
  }

  private updateSessionId(newSessionId?: string | null): void {
    if (newSessionId && newSessionId !== this.sessionId && isPlatformBrowser(this.platformId)) {
      this.sessionId = newSessionId;
      localStorage.setItem(this.SESSION_ID_KEY, this.sessionId);
    }
  }

  private loadInitialCart(): void {
    if (!isPlatformBrowser(this.platformId) || this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    
    // Always try to get server cart first
    this.getServerCart().subscribe({
      next: (cart) => {
        // Ensure all items have proper images and details
        if (cart?.items) {
          cart.items.forEach(item => this.enrichItemWithDetails(item));
        }
        
        this.panierSubject.next(cart);
        // For anonymous users, save the session ID immediately
        if (!this.authState.isLoggedIn && cart?.sessionId) {
          this.updateSessionId(cart.sessionId);
        }
      },
      error: () => {
        // Fallback to local cart only if server fails AND user is anonymous
        if (!this.authState.isLoggedIn) {
          this.loadLocalCart();
        } else {
          this.panierSubject.next(this.createEmptyCart());
        }
      }
    });
  }

  private loadLocalCart(): void {
    const cart = this.getLocalCart();
    
    // Ensure all local cart items have proper details
    if (cart?.items) {
      cart.items.forEach(item => this.enrichItemWithDetails(item));
    }
    
    this.panierSubject.next(cart);
  }

  private loadSessionCart(): Observable<Panier> {
    return this.http.get<Panier>(this.apiUrl, { 
      headers: this.getHeaders()
    }).pipe(
      tap(cart => {
        if (cart?.items) {
          cart.items.forEach(item => this.enrichItemWithDetails(item));
        }
        
        this.updateSessionId(cart?.sessionId);
        this.panierSubject.next(cart);
        this.saveLocalCartWithExpiration(cart);
      }),
      catchError(error => {
        console.error('Error loading session cart:', error);
        const localCart = this.getLocalCart();
        this.panierSubject.next(localCart);
        return of(localCart);
      })
    );
  }

  private loadUserCart(): Observable<Panier> {
    return this.http.get<Panier>(this.apiUrl, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(cart => {
        if (cart?.items) {
          cart.items.forEach(item => this.enrichItemWithDetails(item));
        }
        
        this.panierSubject.next(cart);
      }),
      catchError(error => {
        console.error('Error loading user cart:', error);
        const localCart = this.getLocalCart();
        this.panierSubject.next(localCart);
        return of(localCart);
      })
    );
  }

  private saveLocalCartWithExpiration(panier: Panier): void {
    if (!isPlatformBrowser(this.platformId) || this.authState.isLoggedIn) return;
    
    try {
      const expirationMs = this.CART_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
      const cartData = {
        cart: panier,
        expiration: Date.now() + expirationMs,
        lastUpdated: Date.now()
      };
      
      localStorage.setItem(this.LOCAL_CART_KEY, JSON.stringify(cartData));
    } catch (e) {
      console.error('Error saving local cart:', e);
    }
  }

  private calculateTotalPrice(items: PanierItem[]): number {
    return items?.reduce((total, item) => {
      const quantity = item.quantity || 1;
      let itemPrice = 0;
      
      if (item.isCustomized && item.customProperties?.prixEstime) {
        itemPrice = Number(item.customProperties.prixEstime);
      } else if (item.prixOriginal) {
        itemPrice = Number(item.prixOriginal);
      } else if (item.bassin?.prix) {
        itemPrice = Number(item.bassin.prix);
      }
      
      if (item.promotionActive && item.tauxReduction) {
        // Fix: Apply the percentage reduction correctly
        const reduction = Number(item.tauxReduction) / 100;
        if (reduction > 0 && reduction < 1) {
          itemPrice *= (1 - reduction);
        }
      }
      
      // Assign with default
      item.effectivePrice = itemPrice;
      return total + (itemPrice * quantity);
    }, 0) || 0;
  }

  private setupAuthSubscription(): void {
    this.authState.isLoggedIn$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.syncCartAfterLogin().subscribe();
      } else {
        // Load session cart for anonymous users
        this.loadLocalCart(); this.loadSessionCart().subscribe();
      }
    });
  }

  private migrateItemsIndividually(localCart: Panier): Observable<Panier> {
    if (!localCart.items?.length) {
      return this.getServerCart();
    }
    
    const requests = localCart.items.map(item => {
      const request: PanierItemRequest = {
        bassinId: item.bassinId,
        quantity: item.quantity,
        prixOriginal: item.prixOriginal || 0,
        promotionId: item.promotionActive ? item.bassin?.promotion?.idPromotion : undefined,
        isCustomized: item.isCustomized || false,
        customProperties : item.customProperties || undefined,
        userId: this.authState.currentUserId,
        userEmail: this.authState.currentUserEmail
      };
      
      return this.http.post<any>(`${this.apiUrl}/items`, request, { 
        headers: this.getHeaders() 
      }).pipe(
        catchError(() => of(null))
      );
    });
    
    return forkJoin(requests).pipe(
      switchMap(() => this.getServerCart())
    );
  }

  private handleCartError(error: HttpErrorResponse, defaultMessage: string = 'Erreur'): Observable<never> {
    console.error('Cart error:', error);
    
    if (error.status === 401) {
      this.handleUnauthorizedError();
      return throwError(() => 'Session expirée');
    } 
    
    if (error.status === 409) {
      this.toastService.showError('Stock insuffisant pour ce produit');
      return throwError(() => 'Stock insuffisant');
    }
    
    const message = error.error?.message || defaultMessage;
    this.toastService.showError(message);
    return throwError(() => message);
  }

  private handleUnauthorizedError(): void {
    this.toastService.showError('Session expirée, veuillez vous reconnecter');
    this.authState?.logout();
  }



  // === Méthodes utilitaires pour les opérations optimistes locales ===
  
private createOptimisticItem(
  bassin: Bassin, 
  quantity: number, 
  isCustomized: boolean = false,
  customProperties?: any,
  promotion?: Promotion
): PanierItem {
  const tempId = -Date.now(); // ID temporaire négatif
  
  const item: PanierItem = {
    id: tempId,
    bassin: bassin,
    bassinId: bassin.idBassin,
    quantity: quantity,
    prixOriginal: bassin.prix,
    isCustomized: isCustomized,
    effectivePrice: bassin.prix || 0 // Provide a default of 0
  };
  
  if (promotion) {
    item.promotionActive = true;
    item.tauxReduction = promotion.tauxReduction;
    item.nomPromotion = promotion.nomPromotion;
    item.prixPromo = bassin.prix * (1 - promotion.tauxReduction / 100);
    item.effectivePrice = item.prixPromo || 0; // Provide a default of 0
  }
  
  if (isCustomized && customProperties) {
    item.customProperties = {
      couleurSelectionnee: customProperties.couleur,
      materiauSelectionne: customProperties.materiau,
      dimensionSelectionnee: customProperties.dimension,
      prixEstime: customProperties.prixEstime
    };
    
    item.couleur = customProperties.couleur;
    item.materiau = customProperties.materiau;
    item.dimensions = customProperties.dimension;
    
    if (customProperties.prixEstime) {
      item.prixOriginal = customProperties.prixEstime;
      item.effectivePrice = customProperties.prixEstime;
    }
  }
  
  // Calculer le sous-total avec valeur par défaut
  item.subtotal = (item.effectivePrice || 0) * quantity;
  
  return item;
}
  

  private removeItemFromLocalCart(cart: Panier, itemId: number): Panier {
    const updatedCart = { ...cart };
    
    if (!updatedCart.items) {
      return updatedCart;
    }
    
    const itemIndex = updatedCart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex >= 0) {
      updatedCart.items = [...updatedCart.items];
      updatedCart.items.splice(itemIndex, 1);
      updatedCart.totalPrice = this.calculateTotalPrice(updatedCart.items);
    }
    
    return updatedCart;
  }
  
  private updateQuantityInLocalCart(cart: Panier, itemId: number, newQuantity: number): Panier {
    const updatedCart = { ...cart };
    
    if (!updatedCart.items) {
      return updatedCart;
    }
    
    const itemIndex = updatedCart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex >= 0) {
      updatedCart.items = [...updatedCart.items];
      const currentItem = updatedCart.items[itemIndex];
      updatedCart.items[itemIndex] = {
        ...currentItem,
        quantity: newQuantity,
        subtotal: (currentItem.effectivePrice || 0) * newQuantity
      };
      
      updatedCart.totalPrice = this.calculateTotalPrice(updatedCart.items);
    }
    
    return updatedCart;
  }
  

public getTotalPrice(items: PanierItem[]): number {
  return items.reduce((total, item) => {
    const quantity = item.quantity || 1;
    let itemPrice = 0;
    
    // For customized items
    if (item.isCustomized && item.customProperties?.prixEstime) {
      itemPrice = Number(item.customProperties.prixEstime);
    } 
    // For standard items
    else if (item.prixOriginal) {
      itemPrice = Number(item.prixOriginal);
    } else if (item.bassin?.prix) {
      itemPrice = Number(item.bassin.prix);
    }
    
    // Apply promotion if active
    if (item.promotionActive && item.tauxReduction) {
      const reduction = Number(item.tauxReduction) / 100;
      if (reduction > 0 && reduction < 1) {
        itemPrice *= (1 - reduction);
      }
    }
    
    return total + (itemPrice * quantity);
  }, 0);
}

public calculateCartTotal(panier: Panier): number {
  if (!panier?.items) return 0;
  
  return panier.items.reduce((total, item) => {
    const quantity = item.quantity || 1;
    const price = item.effectivePrice || item.prixOriginal || 0;
    return total + (price * quantity);
  }, 0);
}

private addItemToLocalCart(cart: Panier, newItem: PanierItem): Panier {
  const updatedCart = { ...cart };
  
  if (!updatedCart.items) {
    updatedCart.items = [];
  }
  
  const existingItemIndex = updatedCart.items.findIndex(item => 
    item.bassinId === newItem.bassinId && 
    JSON.stringify(item.customProperties) === JSON.stringify(newItem.customProperties)
  );
  
  if (existingItemIndex >= 0) {
    updatedCart.items[existingItemIndex].quantity += newItem.quantity;
  } else {
    updatedCart.items.push(newItem);
  }
  
  updatedCart.totalPrice = this.calculateCartTotal(updatedCart);
  return updatedCart;
}






/************** */

// Dans CartService, ajoutez/modifiez ces méthodes :

/**
 * Vérifie et met à jour les promotions invalides dans le panier
 */
private checkAndUpdateInvalidPromotions(cart: Panier): { updated: boolean, cart: Panier } {
  let hasInvalidPromotions = false;
  const updatedCart = { ...cart, items: [...cart.items] };

  updatedCart.items.forEach(item => {
    // Cas 1: Promotion expirée ou supprimée
    if (item.promotionActive) {
      const shouldBeActive = this.shouldPromotionBeActive(item);
      
      if (!shouldBeActive) {
        hasInvalidPromotions = true;
        this.resetItemPromotion(item);
      }
    }
  });

  if (hasInvalidPromotions) {
    updatedCart.totalPrice = this.calculateCartTotal(updatedCart);
    return { updated: true, cart: updatedCart };
  }

  return { updated: false, cart };
}

/**
 * Détermine si une promotion devrait être active pour un item
 */
private shouldPromotionBeActive(item: PanierItem): boolean {
  // Cas où la promotion a été supprimée (pas de promotion dans bassin)
  if (!item.bassin?.promotion && item.promotionActive) {
    return false;
  }

  // Cas où la promotion est expirée
  if (item.bassin?.promotion) {
    const now = new Date();
    const startDate = new Date(item.bassin.promotion.dateDebut);
    const endDate = new Date(item.bassin.promotion.dateFin);
    
    return now >= startDate && now <= endDate;
  }

  return false;
}


// Modifiez la méthode getServerCart pour vérifier les promotions :
public getServerCart(): Observable<Panier> {
  let headers = this.getHeaders();
  
  // For anonymous users, ensure session ID is included
  if (!this.authState.isLoggedIn) {
    const sessionId = this.getOrCreateSessionId();
    if (sessionId) {
      headers = headers.set('X-Session-ID', sessionId);
    }
  }

  return this.http.get<Panier>(this.apiUrl, { headers }).pipe(
    map(cart => {
      // Vérifier et mettre à jour les promotions invalides
      const result = this.checkAndUpdateInvalidPromotions(cart);
      return result.updated ? result.cart : cart;
    }),
    tap(cart => {
      if (cart) {
        this.updateSessionId(cart.sessionId);
        this.panierSubject.next(cart);
        
        // For anonymous users, save the full cart locally
        if (!this.authState.isLoggedIn) {
          this.saveLocalCartWithExpiration(cart);
        }
      }
    }),
    catchError(error => {
      console.error('Error loading server cart:', error);
      
      // For anonymous users, fall back to local storage
      if (!this.authState.isLoggedIn) {
        const localCart = this.getLocalCart();
        const result = this.checkAndUpdateInvalidPromotions(localCart);
        this.panierSubject.next(result.cart);
        return of(result.cart);
      }
      
      return of(this.createEmptyCart());
    })
  );
}

// Modifiez aussi getLocalCart pour inclure cette vérification :
public getLocalCart(): Panier {
  if (!isPlatformBrowser(this.platformId)) {
    return this.createEmptyCart();
  }
  
  const cartDataStr = localStorage.getItem(this.LOCAL_CART_KEY);
  if (!cartDataStr) {
    return this.createEmptyCart();
  }
  
  try {
    const cartData: {cart: Panier, expiration: number} = JSON.parse(cartDataStr);
    if (cartData.expiration && cartData.expiration > Date.now()) {
      const cart = cartData.cart;
      
      // Vérifier et mettre à jour les promotions invalides
      const result = this.checkAndUpdateInvalidPromotions(cart);
      
      if (result.updated) {
        this.saveLocalCartWithExpiration(result.cart);
        return result.cart;
      }
      
      return cart;
    }
    localStorage.removeItem(this.LOCAL_CART_KEY);
  } catch (e) {
    console.error('Error parsing local cart', e);
  }
  
  return this.createEmptyCart();
}


/**
 * Vérifie les promotions en temps réel
 */
private checkPromotionsInRealTime(): void {
  if (isPlatformBrowser(this.platformId)) {
    // Vérifie immédiatement
    this.checkPromotionsNow();
    
    // Puis toutes les minutes
    interval(60000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.checkPromotionsNow();
    });
  }
}


private isPromotionValid(item: PanierItem, now: Date): boolean {
  if (!item.bassin?.promotion) return false;
  
  const startDate = new Date(item.bassin.promotion.dateDebut);
  const endDate = new Date(item.bassin.promotion.dateFin);
  
  return now >= startDate && now <= endDate;
}

private applyPromotionToItem(item: PanierItem, promotion: Promotion): void {
  item.promotionActive = true;
  item.tauxReduction = promotion.tauxReduction;
}

private resetItemPromotion(item: PanierItem): void {
  item.promotionActive = false;
  item.prixPromo = undefined;
  item.tauxReduction = undefined;
}

// Dans cart.service.ts, ajoutez ou modifiez cette méthode

/**
 * Vérifie les promotions pour tous les articles du panier
 * @returns Observable<boolean> - true si des mises à jour ont été effectuées
 */
checkForPromotionUpdates(): Observable<boolean> {
  // Si l'utilisateur est connecté, on vérifie côté serveur
  if (this.authState.isLoggedIn) {
    return this.http.get<boolean>(`${this.apiUrl}/panier/check-promotions`, {
      headers: this.authState.getAuthHeaders()
    }).pipe(
      catchError(err => {
        console.error('Erreur lors de la vérification des promotions:', err);
        return of(false);
      })
    );
  } 
  // Sinon, on vérifie côté client
  else {
    return this.getServerCart().pipe(
      map(panier => {
        if (!panier || !panier.items || panier.items.length === 0) {
          return false;
        }
        
        let updated = false;
        const now = new Date();
        
        // Vérifier chaque article du panier
        panier.items.forEach(item => {
          if (item.bassin?.promotion) {
            const startDate = new Date(item.bassin.promotion.dateDebut);
            const endDate = new Date(item.bassin.promotion.dateFin);
            
            // Si l'état de la promotion a changé
            const shouldBeActive = now >= startDate && now <= endDate;
            if (shouldBeActive !== item.promotionActive) {
              item.promotionActive = shouldBeActive;
              item.tauxReduction = shouldBeActive ? item.bassin.promotion.tauxReduction : 0;
              this.calculateEffectivePrice(item);
              updated = true;
            }
          }
        });
        
        // Si des mises à jour ont été effectuées, sauvegarder le panier
        if (updated) {
          this.saveLocalCartWithExpiration(panier);
          this.panierSubject.next(panier);
        }
        
        return updated;
      }),
      catchError(err => {
        console.error('Erreur lors de la vérification des promotions:', err);
        return of(false);
      })
    );
  }
}

/**
 * Force une actualisation complète du panier depuis le serveur ou le stockage local
 */
forceRefreshCart(): Observable<Panier> {
  // Si l'utilisateur est connecté
  if (this.authState.isLoggedIn) {
    return this.http.get<Panier>(this.apiUrl, {
      headers: this.getHeaders()
    }).pipe(
      tap(panier => {
        // Mettre à jour l'état des promotions
        if (panier && panier.items) {
          panier.items.forEach(item => this.calculateEffectivePrice(item));
        }
        this.panierSubject.next(panier);
      }),
      catchError(err => {
        console.error('Erreur lors du rafraîchissement du panier:', err);
        return of(this.getLocalCart());
      })
    );
  } 
  // Sinon, on récupère le panier local
  else {
    const localCart = this.getLocalCart();
    
    // Mettre à jour l'état des promotions
    if (localCart && localCart.items) {
      const now = new Date();
      
      localCart.items.forEach(item => {
        if (item.bassin?.promotion) {
          const startDate = new Date(item.bassin.promotion.dateDebut);
          const endDate = new Date(item.bassin.promotion.dateFin);
          
          item.promotionActive = now >= startDate && now <= endDate;
          item.tauxReduction = item.promotionActive ? item.bassin.promotion.tauxReduction : 0;
          this.calculateEffectivePrice(item);
        }
      });
      
      this.saveLocalCartWithExpiration(localCart);
      this.panierSubject.next(localCart);
    }
    
    return of(localCart);
  }
}



// Dans CartService, ajoutez ces méthodes :

/**
 * Vérifie périodiquement les promotions dans le panier
 */
private checkPromotionsPeriodically(): void {
  if (!isPlatformBrowser(this.platformId)) return;
  
  // Vérifie immédiatement
  this.checkPromotionsNow();
  
  // Puis toutes les minutes
  interval(60000).pipe(
    takeUntil(this.destroy$)
  ).subscribe(() => {
    this.checkPromotionsNow();
  });
}


/**
 * Vérifie l'état actuel des promotions
 */
private checkPromotionsNow(): void {
  const currentCart = this.panierSubject.getValue();
  if (!currentCart?.items?.length) return;

  const now = new Date();
  let needsUpdate = false;
  
  const updatedCart = { ...currentCart, items: [...currentCart.items] };
  
  updatedCart.items.forEach(item => {
    if (item.bassin?.promotion) {
      const promotion = item.bassin.promotion;
      const startDate = new Date(promotion.dateDebut);
      const endDate = new Date(promotion.dateFin);
      
      const isActive = now >= startDate && now <= endDate;
      
      if (item.promotionActive !== isActive) {
        needsUpdate = true;
        item.promotionActive = isActive;
        
        if (isActive) {
          item.tauxReduction = promotion.tauxReduction;
          item.nomPromotion = promotion.nomPromotion;
        } else {
          item.tauxReduction = 0;
          item.nomPromotion = undefined;
        }
        
        this.calculateEffectivePrice(item);
      }
    }
  });

  if (needsUpdate) {
    updatedCart.totalPrice = this.calculateTotalPrice(updatedCart.items);
    this.panierSubject.next(updatedCart);
    
    if (!this.authState.isLoggedIn) {
      this.saveLocalCartWithExpiration(updatedCart);
    }
    
    this.toastService.showInfo('Mise à jour des promotions effectuée');
  }
}

/**
 * Force une vérification des promotions
 */
public forceCheckPromotions(): Observable<boolean> {
  return this.forceRefreshCart().pipe(
    map(panier => {
      const hadPromotions = panier.items?.some(item => item.promotionActive) || false;
      return hadPromotions;
    })
  );
}
}