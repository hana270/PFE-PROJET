import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  BehaviorSubject,
  forkJoin,
  interval,
  Observable,
  of,
  Subject,
  throwError,
} from 'rxjs';
import {
  catchError,
  map,
  tap,
  switchMap,
  distinctUntilChanged,
  finalize,
  takeUntil,
  timeout,
} from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Bassin } from '../models/bassin.models';
import { ToastService } from './toast.service';
import { Panier, PanierItem } from '../models/panier.model';
import { Promotion } from '../models/promotion.model';
import {
  CustomProperties,
  PanierItemRequest,
} from '../models/panier-item.model';
import { AuthStateService } from './auth-state.service';
import { ChangeDetectorRef } from '@angular/core';
import { Accessoire } from '../models/accessoire.models';
import { InsufficientStockError } from '../errors/insufficient-stock.error';
import { BassinPersonnalise } from '../models/bassinpersonnalise.models';
import { BassinService } from './bassin.service';
import { ImageBassin } from '../models/image.models';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  apiUrl = 'http://localhost:8090/orders/api/panier';

  // Configuration
  private CART_EXPIRATION_HOURS = 2; // 2 heures d'expiration

  private readonly LOCAL_CART_KEY = 'local_cart_v2';
  private readonly SESSION_ID_KEY = 'user_session_id';

  // État du panier
  private panierSubject = new BehaviorSubject<Panier>(this.getInitialCart());
  public panier$ = this.panierSubject.asObservable();

  private sessionId: string = '';
  private isInitialized = false;
  private pendingRequests = 0;
  private promotionCheckInterval = 60000;

  private destroy$ = new Subject<void>();
  private lastCartState: Panier | null = null;
  cart$ = this.panierSubject.asObservable();


  constructor(
    private authState: AuthStateService,
    private http: HttpClient,
    private toastService: ToastService,
    private bassinService: BassinService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loadInitialCart();
    this.setupAuthSubscription();
    this.checkPromotionsInRealTime();

     // Initialisation du panier
  if (isPlatformBrowser(this.platformId)) {
    this.initializeSessionId();
    this.loadCart();
  }

  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
// Méthode pour initialiser un sessionId persistant
private initializeSessionId(): void {
  let sessionId = localStorage.getItem(this.SESSION_ID_KEY);
  
  // Si aucun sessionId n'existe, en créer un nouveau
  if (!sessionId) {
    sessionId = this.generateUniqueSessionId();
    localStorage.setItem(this.SESSION_ID_KEY, sessionId);
  }
}

// Génération d'un identifiant unique pour la session
private generateUniqueSessionId(): string {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
// Méthode pour obtenir les en-têtes avec le sessionId
private getHeaders(): HttpHeaders {
  let headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });
  
  // Ajouter le token JWT si l'utilisateur est connecté
  if (this.authState.isLoggedIn) {
    headers = headers.set('Authorization', `Bearer ${this.authState.getToken()}`);
  }
  
  // Ajouter toujours le sessionId pour assurer la persistance du panier
  const sessionId = localStorage.getItem(this.SESSION_ID_KEY);
  if (sessionId) {
    headers = headers.set('X-Session-ID', sessionId);
  }
  
  return headers;
}


// Méthode pour charger le panier (connecté ou non)
loadCart(): Observable<Panier> {
  if (!isPlatformBrowser(this.platformId)) {
    return of(this.createEmptyCart());
  }
  
  this.pendingRequests++;
  
  return this.http.get<{ success: boolean; cart: Panier }>(`${this.apiUrl}`, {
    headers: this.getHeaders()
  }).pipe(
    map(response => response.cart),
    tap(cart => {
      if (cart?.items) {
        cart.items.forEach(item => this.enrichItemWithDetails(item));
      }
      this.panierSubject.next(cart);
    }),
    catchError(error => {
      console.error('Error loading cart:', error);
      return of(this.createEmptyCart());
    }),
    finalize(() => this.pendingRequests--)
  );
}


  /**
   * Met à jour la quantité d'un article dans le panier
   * @param item Article à mettre à jour
   * @param newQuantity Nouvelle quantité
   * @returns Observable avec le résultat
   */
  updateQuantity(item: PanierItem, newQuantity: number): Observable<boolean> {
    if (!item?.id) {
      return throwError(() => new Error('Article invalide'));
    }

    // Pour les bassins personnalisés, pas de vérification de stock
    if (item.isCustomized) {
      return this.updateCartItemQuantity(item.id, newQuantity);
    }

    // Pour les bassins standards, vérifier le stock
    if (item.bassin && newQuantity > item.bassin.stock) {
      this.toastService.showError(`Stock limité à ${item.bassin.stock} unités`);
      return of(false);
    }

    return this.updateCartItemQuantity(item.id, newQuantity);
  }
  /**
   * Met à jour la quantité d'un article dans le panier
   * @param itemId ID de l'article
   * @param newQuantity Nouvelle quantité
   * @returns Observable avec le résultat
   */
   updateCartItemQuantity(
    itemId: number,
    newQuantity: number
  ): Observable<boolean> {
    if (newQuantity <= 0) {
      return this.removeFromCart(itemId);
    }

    // Mise à jour optimiste locale
    const currentCart = this.panierSubject.getValue();
    const updatedCart = this.updateQuantityInLocalCart(
      currentCart,
      itemId,
      newQuantity
    );
    this.panierSubject.next(updatedCart);
    this.pendingRequests++;

    return this.http
      .put<{ success: boolean }>(
        `${this.apiUrl}/items/${itemId}/quantity`,
        { quantity: newQuantity },
        { headers: this.getHeaders() }
      )
      .pipe(
        tap((response) => {
          if (!response.success) {
            // Revert local update if server fails
            this.panierSubject.next(currentCart);
          } else {
            // For anonymous users, save the updated cart
            if (!this.authState.isLoggedIn) {
              this.saveLocalCartWithExpiration(updatedCart);
            }
          }
        }),
        map((response) => response.success),
        catchError((error) => {
          // Revert local update on error
          this.panierSubject.next(currentCart);
          console.error('Error updating quantity:', error);

          // For anonymous users, fallback to local update
          if (!this.authState.isLoggedIn) {
            this.saveLocalCartWithExpiration(updatedCart);
            return of(true);
          }

          return of(false);
        }),
        finalize(() => this.pendingRequests--)
      );
  }
// Dans la classe CartService

/**
 * Retourne le prix supplémentaire pour un matériau donné
 */
public getMaterialPrice(materiau: string): number {
  // Vous pouvez soit:
  // 1. Utiliser une liste de prix définie dans le service
  // 2. Faire une requête API pour obtenir le prix
  // 3. Utiliser une logique de calcul
  
  // Exemple avec une liste de prix locale:
  const materialPrices: {[key: string]: number} = {
    'Béton fibré haute performance': 50,
    'Polyéthylène haute densité (PEHD)': 60,
    'Composite verre-résine': 70,
    'Acier inoxydable 316L (marine)': 80,
    "Tôle d'acier galvanisé à chaud": 90,
    'PVC renforcé': 100,
    'Membrane EPDM épaisseur 1.5mm': 110,
    'Géomembrane HDPE': 120,
    'Pierre reconstituée': 130,
    'Fibre de carbone': 140,
    'Bâche armée PVC 900g/m²': 150,
    'Polypropylène expansé': 160,
    'Béton polymère': 170,
    'Aluminium anodisé': 180,
    'Titane grade 2': 190,
    'Bois composite': 200,
    'Résine époxy renforcée': 210,
  };
  
  return materialPrices[materiau] || 0;
}

/**
 * Retourne le prix supplémentaire pour une dimension donnée
 */
public getDimensionPrice(dimension: string): number {
  // Même approche que pour les matériaux
  const dimensionPrices: {[key: string]: number} = {
    '150x100x80 cm (≈ 1 200L)': 100,
    '180x120x90 cm (≈ 1 944L)': 150,
    '200x150x100 cm (≈ 3 000L)': 200,
    '250x180x120 cm (≈ 5 400L)': 300,
    '300x200x150 cm (≈ 9 000L)': 400,
    '350x250x150 cm (≈ 13 125L)': 500,
    '400x300x200 cm (≈ 24 000L)': 600,
    '500x350x200 cm (≈ 35 000L)': 700,
    '600x400x250 cm (≈ 60 000L)': 800,
    '700x500x300 cm (≈ 105 000L)': 900,
    '800x600x350 cm (≈ 168 000L)': 1000,
    '1000x700x400 cm (≈ 280 000L)': 1200,
  };
  
  return dimensionPrices[dimension] || 0;
}
  /**
   * Ajoute un bassin (standard ou personnalisé) au panier avec tous les détails de personnalisation
   * @param bassin Le bassin à ajouter
   * @param quantity La quantité désirée
   * @param promotion La promotion éventuelle
   * @param isCustomized Si le bassin est personnalisé
   * @returns Observable avec le résultat et le panier mis à jour
   */

  /**
   * Ajoute un bassin (standard ou personnalisé) au panier
   */
  
  addBassinToCart(
    bassin: Bassin | BassinPersonnalise,
    quantity: number,
    promotion?: Promotion,
    isCustomized: boolean = false,
    customProperties?: {
      materiau?: string;
      dimensions?: string;
      couleur?: string;
      dureeFabrication?: string;
      prixEstime?: number;
      accessoires?: Accessoire[];
    }
  ): Observable<{ success: boolean; message?: string; cart?: Panier }> {
    // Vérification des paramètres obligatoires
    if (!bassin?.idBassin) {
      return throwError(() => new Error('Bassin invalide'));
    }
  
    // Calcul du prix des accessoires
    const accessoiresPrice = customProperties?.accessoires?.reduce(
      (sum, acc) => sum + (acc.prixAccessoire || 0),
      0
    ) || 0;
  
    // Récupération de l'image
    const getImagePath = (image: ImageBassin | string): string => {
      if (typeof image === 'string') return image;
      return image.imagePath || 'assets/default-image.webp';
    };
  
    const imageUrl = bassin.imagesBassin?.length > 0
      ? getImagePath(bassin.imagesBassin[0])
      : 'assets/default-image.webp';
   
  // Détermination du statut
  let status: 'DISPONIBLE' | 'SUR_COMMANDE' | 'RUPTURE_STOCK';
  if (isCustomized) {
    status = 'SUR_COMMANDE';
  } else {
    const bassinStandard = bassin as Bassin;
    status = bassinStandard.statut; // Récupération directe du statut du bassin
  }

   // Création de la requête
  const request: PanierItemRequest = {
    bassinId: bassin.idBassin,
    quantity: quantity,
    isCustomized: isCustomized,
    prixOriginal: bassin.prix,
    prixMateriau: 0,
    prixDimension: 0,
    prixAccessoires: accessoiresPrice,
    prixEstime: bassin.prix + accessoiresPrice,
    nomBassin: bassin.nomBassin,
    imageUrl: imageUrl,
    status: status, // Utilisation du statut déterminé
  };
  
    // Ajout des propriétés de personnalisation si nécessaire
    if (isCustomized && customProperties) {
      request.materiauSelectionne = customProperties.materiau || '';
      request.dimensionSelectionnee = customProperties.dimensions || '';
      request.couleurSelectionnee = customProperties.couleur || '';
      request.dureeFabrication = customProperties.dureeFabrication || 'À déterminer';
  
      // Calcul des suppléments pour matériau et dimensions
      if (customProperties.materiau) {
        request.prixMateriau = this.getMaterialPrice(customProperties.materiau);
        request.prixEstime += request.prixMateriau;
      }
  
      if (customProperties.dimensions) {
        request.prixDimension = this.getDimensionPrice(customProperties.dimensions);
        request.prixEstime += request.prixDimension;
      }
  
      // Si un prix estimé est fourni explicitement, l'utiliser
      if (customProperties.prixEstime !== undefined) {
        request.prixEstime = customProperties.prixEstime;
      }
  
      // Ajout des IDs des accessoires
      if (customProperties.accessoires?.length) {
        request.accessoireIds = customProperties.accessoires.map(acc => acc.idAccessoire);
      }
    }
  
    // Ajout des informations de promotion
    if (promotion) {
      request.promotionId = promotion.idPromotion;
      request.nomPromotion = promotion.nomPromotion;
      request.tauxReduction = promotion.tauxReduction;
      request.promotionActive = true;
    }
  
    return this.addItemToCart(request);
  }

// Méthode unifiée addItemToCart
addItemToCart(item: PanierItemRequest): Observable<{ success: boolean; message?: string; cart?: Panier }> {
  // Pour les bassins personnalisés, vérifier s'il en existe un identique
  if (item.isCustomized && this.hasIdenticalCustomBassin(item)) {
    const existingItem = this.panierSubject.value.items?.find(cartItem => {
      return cartItem.isCustomized &&
             cartItem.bassinId === item.bassinId &&
             cartItem.customization?.materiauSelectionne === item.materiauSelectionne &&
             cartItem.customization?.dimensionSelectionnee === item.dimensionSelectionnee &&
             cartItem.customization?.couleurSelectionnee === item.couleurSelectionnee &&
             this.areAccessoiresIdentical(cartItem.accessoireIds, item.accessoireIds);
    });
    
    if (existingItem) {
      return this.updateQuantity(existingItem, existingItem.quantity + item.quantity).pipe(
        switchMap(success => {
          if (success) {
            return of({ success: true, cart: this.panierSubject.value });
          }
          return of({ success: false, message: 'Échec de la mise à jour de la quantité' });
        })
      );
    }
  }
  
  // Pour les bassins standards ou un nouveau bassin personnalisé
  return this.http.post<{ success: boolean; message?: string; cart?: Panier }>(
    `${this.apiUrl}/items`,
    item,
    { headers: this.getHeaders() }
  ).pipe(
    tap(response => {
      if (response.success && response.cart) {
        this.panierSubject.next(response.cart);
      }
    }),
    catchError(error => {
      console.error('Error adding to cart:', error);
      return of({
        success: false,
        message: error.error?.message || 'Erreur lors de l\'ajout au panier'
      });
    })
  );
}

private defaultCart(): Panier {
  return {
      id: 0,
      userId: this.authState.currentUserId,
      sessionId: this.sessionId,
      items: [],
      totalPrice: 0,
      lastUpdated: new Date()
  };
}
private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
        return error.error.message;
    }
    if (error.status === 409) {
        return 'Stock insuffisant';
    }
    if (error.status === 400) {
        return 'Données invalides';
    }
    return "Erreur lors de l'ajout au panier";
}

  // Méthode pour obtenir les détails complets d'un article du panier
  getItemDetails(item: PanierItem): Observable<PanierItem> {
    if (!item) return throwError(() => new Error('Article invalide'));

    // Si c'est un bassin personnalisé, on a déjà tous les détails
    if (item.isCustomized) {
      // Ajouter les propriétés manquantes
      const enrichedItem: PanierItem = {
        ...item,
        nomBassin: item.customProperties?.bassinBase?.nom
          ? `${item.customProperties.bassinBase.nom} Personnalisé`
          : 'Bassin Personnalisé',
        imageUrl:
          item.customProperties?.bassinBase?.imageUrl ||
          'assets/default-image.webp',
        prixOriginal:
          item.customProperties?.prixEstime || item.prixOriginal || 0,
      };
      return of(enrichedItem);
    }

    // Pour les bassins standards, on récupère les détails depuis l'API
    return this.bassinService.consulterBassin(item.bassinId).pipe(
      map((bassin) => ({
        ...item,
        bassin: bassin,
        nomBassin: bassin.nomBassin,
        description: bassin.description,
        imageUrl: bassin.imagesBassin?.[0]?.imagePath,
        prixOriginal: bassin.prix,
        status: bassin.statut,
        dureeFabrication: bassin.dureeFabricationDisplay,
      })),
      catchError(() => of(item)) // Retourner l'item tel quel en cas d'erreur
    );
  }

  // Méthode pour formater les détails d'un article pour l'affichage
  formatItemDetails(item: PanierItem): string {
    const details: string[] = [];

    // Informations de base
    details.push(item.isCustomized ? 'Bassin personnalisé' : 'Bassin standard');

    // Détails spécifiques
    if (item.isCustomized) {
      if (item.customProperties?.materiauSelectionne) {
        details.push(`Matériau: ${item.customProperties.materiauSelectionne}`);
      }
      if (item.customProperties?.dimensionSelectionnee) {
        details.push(
          `Dimensions: ${item.customProperties.dimensionSelectionnee}`
        );
      }
      if (item.customProperties?.couleurSelectionnee) {
        details.push(`Couleur: ${item.customProperties.couleurSelectionnee}`);
      }
      if (item.customProperties?.dureeFabrication) {
        details.push(
          `Fabrication: ${item.customProperties.dureeFabrication} jours`
        );
      }
    } else if (item.bassin) {
      if (item.bassin.dimensions)
        details.push(`Dimensions: ${item.bassin.dimensions}`);
      if (item.bassin.materiau)
        details.push(`Matériau: ${item.bassin.materiau}`);
      if (item.bassin.couleur) details.push(`Couleur: ${item.bassin.couleur}`);
      if (item.bassin.dureeFabricationDisplay) {
        details.push(`Fabrication: ${item.bassin.dureeFabricationDisplay}`);
      }
    }

    // Promotion
    if (item.promotionActive) {
      details.push(`Promotion: ${item.nomPromotion} (-${item.tauxReduction}%)`);
    }

    return details.join(' • ') || 'Détails non disponibles';
  }

  // Méthode pour afficher les détails du panier
  getCartItemDetails(item: any): string {
    if (item.isCustomized) {
      return `
      Bassin personnalisé: 
      Matériau: ${item.materiauSelectionne}, 
      Dimensions: ${item.dimensionSelectionnee}, 
      Couleur: ${item.couleurSelectionnee}
      ${
        item.accessoires?.length
          ? '(+ ' + item.accessoires.length + ' accessoires)'
          : ''
      }
    `;
    } else {
      let details = `Bassin standard`;
      if (item.promotionActive) {
        details += ` (En promotion: ${item.nomPromotion} -${item.tauxReduction}%)`;
      }
      return details;
    }
  }
  // Méthode pour calculer le total des accessoires
  private calculateAccessoiresTotal(accessoires: Accessoire[]): number {
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

  private prepareCartRequest(
    bassin: Bassin,
    quantity: number,
    isCustomized: boolean,
    customProperties: any,
    promotion?: Promotion
  ) {
    const request: any = {
      bassinId: bassin.idBassin,
      quantity,
      isCustomized,
      status: isCustomized ? 'SUR_COMMANDE' : bassin.statut,
      prixOriginal: isCustomized ? customProperties?.prixEstime : bassin.prix,
    };

    // Ajout conditionnel des propriétés
    if (isCustomized && customProperties) {
      request.customProperties =
        this.simplifyCustomProperties(customProperties);
    }

    // Gestion simplifiée de la promotion
    if (promotion && this.isPromotionActive(promotion)) {
      request.promotionId = promotion.idPromotion;
      request.tauxReduction = promotion.tauxReduction;
    }

    return request;
  }

  private simplifyCustomProperties(props: any) {
    // Ne garder que les propriétés essentielles
    return {
      bassinBase: props.bassinBase,
      materiau: props.materiau,
      dimensions: props.dimensions,
      couleur: props.couleur,
      prixEstime: props.prixEstime,
      dureeFabrication: props.dureeFabrication,
      // Accessoires simplifiés
      accessoires: props.accessoires?.map((a: any) => ({
        id: a.idAccessoire,
        nom: a.nomAccessoire,
      })),
    };
  }

  // Méthode helper pour vérifier si une promotion est active
  private isPromotionActive(promotion: Promotion): boolean {
    if (!promotion || !promotion.dateDebut || !promotion.dateFin) {
      return false;
    }

    try {
      const now = new Date();
      const startDate = new Date(promotion.dateDebut);
      const endDate = new Date(promotion.dateFin);

      // Ajouter un jour à la date de fin pour inclure le dernier jour
      endDate.setDate(endDate.getDate() + 1);

      return now >= startDate && now < endDate;
    } catch (e) {
      console.error('Erreur lors de la vérification de la promotion', e);
      return false;
    }
  }

  /**
   * Met à jour la quantité d'un article dans le panier local
   */
  private updateQuantityInLocalCart(
    cart: Panier,
    itemId: number,
    newQuantity: number
  ): Panier {
    const updatedCart = { ...cart };

    if (!updatedCart.items) {
      return { ...updatedCart, totalPrice: 0 };
    }

    const itemIndex = updatedCart.items.findIndex((item) => item.id === itemId);

    if (itemIndex >= 0) {
      updatedCart.items = [...updatedCart.items];
      const currentItem = updatedCart.items[itemIndex];

      updatedCart.items[itemIndex] = {
        ...currentItem,
        quantity: newQuantity,
        subtotal: (currentItem.effectivePrice || 0) * newQuantity,
      };

      updatedCart.totalPrice = this.calculateTotalPrice(updatedCart.items);
    }

    return updatedCart;
  }

  /**
   * Supprime un article du panier
   */
  removeFromCart(itemId: number): Observable<boolean> {
    // Mise à jour optimiste locale
    const currentCart = this.panierSubject.getValue();
    const updatedCart = this.removeItemFromLocalCart(currentCart, itemId);
    this.panierSubject.next(updatedCart);
    this.pendingRequests++;

    return this.http
      .delete<boolean>(`${this.apiUrl}/items/${itemId}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((success) => {
          if (!success) {
            // Revert local update if server fails
            this.panierSubject.next(currentCart);
          } else {
            // For anonymous users, save the updated cart
            if (!this.authState.isLoggedIn) {
              this.saveLocalCartWithExpiration(updatedCart);
            }
          }
        }),
        catchError((error) => {
          // Revert local update on error
          this.panierSubject.next(currentCart);
          console.error('Error removing item:', error);

          // For anonymous users, fallback to local update
          if (!this.authState.isLoggedIn) {
            this.saveLocalCartWithExpiration(updatedCart);
            return of(true);
          }

          return of(false);
        }),
        finalize(() => this.pendingRequests--)
      );
  }

  /**
   * Supprime un article du panier local
   */
  private removeItemFromLocalCart(cart: Panier, itemId: number): Panier {
    const updatedCart = { ...cart };

    if (!updatedCart.items) {
      return updatedCart;
    }

    const itemIndex = updatedCart.items.findIndex((item) => item.id === itemId);

    if (itemIndex >= 0) {
      updatedCart.items = [...updatedCart.items];
      updatedCart.items.splice(itemIndex, 1);
      updatedCart.totalPrice = this.calculateTotalPrice(updatedCart.items);
    }

    return updatedCart;
  }
  /**
   * Génère un ID temporaire pour les articles avant enregistrement serveur
   */
  private generateTempId(): number {
    return Math.floor(Math.random() * 1000000) + Date.now();
  }

  /**
   * Obtient l'URL de l'image du bassin
   */
  private getBassinImageUrl(bassin: Bassin): string {
    if (bassin.imagesBassin?.[0]?.imagePath) {
      return `${this.apiUrl}/imagesBassin/getFS/${encodeURIComponent(
        bassin.imagesBassin[0].imagePath
      )}`;
    }
    return 'assets/default-image.webp';
  }

  public updateCart(panier: Panier): void {
    // Mettre à jour le panier localement
    this.panierSubject.next(panier);

    // Pour les utilisateurs non connectés, sauvegarder dans le localStorage
    if (!this.authState.isLoggedIn && isPlatformBrowser(this.platformId)) {
      this.saveLocalCartWithExpiration(panier);
    }
  }

  private getFabricationDurationInDays(bassin: Bassin): number {
    if (bassin.dureeFabricationJours) {
      return bassin.dureeFabricationJours;
    }

    // Default fallback
    return 14; // 2 weeks
  }

  /*
  private calculateEffectivePrice(basePrice: number, reductionRate?: number): number {
    if (!reductionRate) return basePrice;
    return basePrice * (1 - (reductionRate / 100));
  }
  */
  private getFabricationDuration(bassin: Bassin): string {
    if (bassin.dureeFabricationJours) {
      return `${bassin.dureeFabricationJours} jours`;
    } else if (
      bassin.dureeFabricationJoursMin &&
      bassin.dureeFabricationJoursMax
    ) {
      return `Entre ${bassin.dureeFabricationJoursMin} et ${bassin.dureeFabricationJoursMax} jours`;
    }
    return '2-3 semaines';
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

    return this.http
      .delete<{ success: boolean }>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(
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
        map((response) => response.success),
        catchError((error) => {
          // Restaurer le panier précédent
          this.panierSubject.next(currentCart);
          console.error('Error clearing cart:', error);
          this.toastService.showError(
            'Erreur lors de la suppression du panier'
          );

          // Fallback pour utilisateurs anonymes
          if (
            !this.authState.isLoggedIn &&
            isPlatformBrowser(this.platformId)
          ) {
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
    return this.http
      .post<any>(`${this.apiUrl}/migrate`, null, {
        headers: this.getHeaders(),
        observe: 'response',
      })
      .pipe(
        map((response) => {
          const panier =
            response.body?.panier || (response.body?.cart as Panier);
          if (panier?.items) {
            panier.items.forEach((item: PanierItem) =>
              this.enrichItemWithDetails(item)
            );
          }
          return panier;
        }),
        tap((panier) => {
          if (panier) {
            localStorage.removeItem(this.SESSION_ID_KEY);
            this.panierSubject.next(panier);
            this.toastService.showSuccess('Votre panier a été récupéré');
          }
        }),
        catchError((error) => {
          console.error('Migration error:', error);
          this.toastService.showError(
            'Erreur lors de la récupération du panier'
          );
          return this.loadUserCart();
        }),
        finalize(() => this.pendingRequests--)
      );
  }

  /**
   * Synchronise le panier local avec le panier serveur après connexion
   */
  syncCartAfterLogin(): Observable<Panier> {
    const localCart = this.getLocalCart();

    if (!localCart.items?.length) {
      return this.loadUserCart();
    }

    // Migration des articles un par un
    const requests = localCart.items.map((item) => {
      const request: any = {
        // Utilisez any temporairement ou étendez PanierItemRequest
        bassinId: item.bassinId,
        quantity: item.quantity,
        prixOriginal: item.prixOriginal ?? 0,
        isCustomized: item.isCustomized ?? false,
        customProperties: item.customProperties,
        userId: this.authState.currentUserId,
        // status et dureeFabrication seulement si nécessaires côté serveur
        ...(item.status && { status: item.status }),
        ...(item.dureeFabrication && {
          dureeFabrication: item.dureeFabrication,
        }),
      };

      if (item.promotionActive && item.bassin?.promotion) {
        request.promotionId = item.bassin.promotion.idPromotion;
        request.tauxReduction = item.bassin.promotion.tauxReduction;
        request.nomPromotion = item.bassin.promotion.nomPromotion;
      }

      return this.http
        .post<any>(`${this.apiUrl}/items`, request, {
          headers: this.getHeaders(),
        })
        .pipe(catchError(() => of(null)));
    });

    return forkJoin(requests).pipe(
      switchMap(() => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem(this.LOCAL_CART_KEY);
        }
        return this.loadUserCart();
      }),
      catchError(() => this.loadUserCart())
    );
  }
  /**
   * Récupère les articles du panier sous forme d'Observable
   */
  public getCartItems(): Observable<PanierItem[]> {
    return this.panier$.pipe(
      map((panier) => panier?.items || []),
      distinctUntilChanged(
        (prev, next) => JSON.stringify(prev) === JSON.stringify(next)
      )
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
   * Enrichit un bassin avec des détails supplémentaires
   */
  private enrichItemWithDetails(item: PanierItem, bassin?: Bassin): void {
    if (!item) return;
  
    const sourceBassin = bassin || item.bassin;
  
    // Initialisation des customProperties si inexistants
    if (item.isCustomized && !item.customProperties) {
      item.customProperties = {
        dimensions: item.customization!.dimensionSelectionnee || '',
        couleur: item.customization!.couleurSelectionnee || '',
        materiau: item.customization!.materiauSelectionne || '',
        accessoires: item.accessoires || [],
        prixEstime: item.customization!.prixEstime || item.prixOriginal || 0,
        dureeFabrication: item.dureeFabrication || 'À déterminer',
        materiauPrice: item.customization!.prixMateriau || 0,
        dimensionPrice: item.customization!.prixDimension || 0,
        accessoiresPrice: item.prixAccessoires || 0,
        basePrice: item.prixOriginal || 0,
        imageUrl: item.imageUrl,
        bassinBase: item.bassinBase || (sourceBassin ? {
          id: sourceBassin.idBassin,
          nom: sourceBassin.nomBassin,
          imageUrl: this.extractFirstImageUrl(sourceBassin),
          prix: sourceBassin.prix
        } : undefined)
      };
    }
  
    // Calcul du prix effectif
    this.calculateEffectivePrix(item);
  }

  /**
   * Calcule le prix effectif en tenant compte des promotions
   */

  public calculateEffectivePrice(
    basePrice: number,
    reductionRate?: number
  ): number {
    if (!reductionRate) return basePrice;
    const discountedPrice = basePrice * (1 - reductionRate / 100);
    return Math.round(discountedPrice * 100) / 100; // Round to 2 decimal places
  }
  updateItemEffectivePrice(item: PanierItem): PanierItem {
    return {
      ...item,
      effectivePrice: this.calculateEffectivePrice(
        item.prixOriginal || 0,
        item.promotionActive ? item.tauxReduction : undefined
      ),
      subtotal:
        item.quantity *
        this.calculateEffectivePrice(
          item.prixOriginal || 0,
          item.promotionActive ? item.tauxReduction : undefined
        ),
    };
  }
  // ========== PRIVATE METHODS ==========

  private getInitialCart(): Panier {
    return {
        id: -1,
        items: [],
        totalPrice: 0,
        userId: null, // Au lieu de undefined
        sessionId: null // Au lieu de undefined
    };
}

private createEmptyCart(): Panier {
    return {
        id: -1,
        items: [],
        totalPrice: 0,
        userId: this.authState.isLoggedIn ? this.authState.currentUserId : null,
        sessionId: !this.authState.isLoggedIn ? this.getOrCreateSessionId() : null
    };
}
/*
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    // Add JWT if available
    const token = this.authState.currentToken;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // Add session ID for anonymous users
    if (!this.authState.isLoggedIn) {
      const sessionId = this.getOrCreateSessionId();
      if (sessionId) {
        headers = headers.set('X-Session-ID', sessionId);
      }
    }

    return headers;
  }
*/
 
  private getOrCreateSessionId(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
        let sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = this.generateSessionId();
            localStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }
    return null;
}

private generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
  private updateSessionId(newSessionId?: string | null): void {
    if (
      newSessionId &&
      newSessionId !== this.sessionId &&
      isPlatformBrowser(this.platformId)
    ) {
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
          cart.items.forEach((item) => this.enrichItemWithDetails(item));
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
      },
    });
  }

  private loadLocalCart(): void {
    const cart = this.getLocalCart();

    // Ensure all local cart items have proper details
    if (cart?.items) {
      cart.items.forEach((item) => this.enrichItemWithDetails(item));
    }

    this.panierSubject.next(cart);
  }

  private loadSessionCart(): Observable<Panier> {
    return this.http
      .get<Panier>(this.apiUrl, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((cart) => {
          if (cart?.items) {
            cart.items.forEach((item) => this.enrichItemWithDetails(item));
          }

          this.updateSessionId(cart?.sessionId);
          this.panierSubject.next(cart);
          this.saveLocalCartWithExpiration(cart);
        }),
        catchError((error) => {
          console.error('Error loading session cart:', error);
          const localCart = this.getLocalCart();
          this.panierSubject.next(localCart);
          return of(localCart);
        })
      );
  }

  private loadUserCart(): Observable<Panier> {
    return this.http
      .get<Panier>(this.apiUrl, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((cart) => {
          if (cart?.items) {
            cart.items.forEach((item) => this.enrichItemWithDetails(item));
          }

          this.panierSubject.next(cart);
        }),
        catchError((error) => {
          console.error('Error loading user cart:', error);
          const localCart = this.getLocalCart();
          this.panierSubject.next(localCart);
          return of(localCart);
        })
      );
  }

  /*****
   *
   */
  private saveLocalCartWithExpiration(panier: Panier): void {
    if (!isPlatformBrowser(this.platformId) || this.authState.isLoggedIn)
      return;

    const expiration = new Date();
    expiration.setHours(expiration.getHours() + this.CART_EXPIRATION_HOURS);

    const cartData = {
      cart: panier,
      expiresAt: expiration.getTime(),
    };

    localStorage.setItem(this.LOCAL_CART_KEY, JSON.stringify(cartData));
  }

  public getLocalCart(): Panier {
    if (!isPlatformBrowser(this.platformId)) return this.createEmptyCart();

    const cartDataStr = localStorage.getItem(this.LOCAL_CART_KEY);
    if (!cartDataStr) return this.createEmptyCart();

    try {
      const cartData = JSON.parse(cartDataStr);
      if (cartData.expiresAt && cartData.expiresAt > Date.now()) {
        return cartData.cart;
      }
      localStorage.removeItem(this.LOCAL_CART_KEY);
    } catch (e) {
      console.error('Error parsing local cart', e);
    }

    return this.createEmptyCart();
  }

  private calculateTotalPrice(items: PanierItem[] = []): number {
    return items.reduce((total, item) => {
      const quantity = item.quantity || 1;
      const itemPrice =
        item.effectivePrice || item.prixUnitaire || item.prixOriginal || 0;
      return total + itemPrice * quantity;
    }, 0);
  }

  private setupAuthSubscription(): void {
    this.authState.isLoggedIn$.subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        this.syncCartAfterLogin().subscribe();
      } else {
        // Load session cart for anonymous users
        this.loadLocalCart();
        this.loadSessionCart().subscribe();
      }
    });
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
          itemPrice *= 1 - reduction;
        }
      }

      return total + itemPrice * quantity;
    }, 0);
  }

  public calculateCartTotal(panier: Panier): number {
    if (!panier?.items) return 0;

    return panier.items.reduce((total, item) => {
      const quantity = item.quantity || 1;
      const price = item.effectivePrice || item.prixOriginal || 0;
      return total + price * quantity;
    }, 0);
  }

  private addItemToLocalCart(cart: Panier, newItem: PanierItem): Panier {
    const updatedCart = { ...cart, items: [...(cart.items || [])] };

    // Pour les articles non personnalisés, vérifier s'il existe déjà le même bassin
    if (!newItem.isCustomized && newItem.bassinId) {
      const existingItemIndex = updatedCart.items.findIndex(
        (item) =>
          !item.isCustomized &&
          item.bassinId === newItem.bassinId &&
          item.promotionActive === newItem.promotionActive
      );

      if (existingItemIndex >= 0) {
        // Mise à jour de la quantité si même bassin et même état de promotion
        updatedCart.items[existingItemIndex].quantity += newItem.quantity;
      } else {
        // Ajout comme nouvel article si promotion différente
        updatedCart.items.push(newItem);
      }
    } else {
      // Pour les articles personnalisés, toujours ajouter comme nouvel article
      updatedCart.items.push(newItem);
    }

    // Recalculer le prix total
    updatedCart.totalPrice = this.calculateTotalPrice(updatedCart.items);
    return updatedCart;
  }

  /************** */

  // Dans CartService, ajoutez/modifiez ces méthodes :

  /**
   * Vérifie et met à jour les promotions invalides dans le panier
   */
  private checkAndUpdateInvalidPromotions(cart: Panier): {
    updated: boolean;
    cart: Panier;
  } {
    let hasInvalidPromotions = false;
    const updatedCart = { ...cart, items: [...cart.items] };

    updatedCart.items.forEach((item) => {
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
      map((cart) => {
        // Vérifier et mettre à jour les promotions invalides
        const result = this.checkAndUpdateInvalidPromotions(cart);
        return result.updated ? result.cart : cart;
      }),
      tap((cart) => {
        if (cart) {
          this.updateSessionId(cart.sessionId);
          this.panierSubject.next(cart);

          // For anonymous users, save the full cart locally
          if (!this.authState.isLoggedIn) {
            this.saveLocalCartWithExpiration(cart);
          }
        }
      }),
      catchError((error) => {
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

  /**
   * Vérifie les promotions en temps réel
   */
  private checkPromotionsInRealTime(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Vérifie immédiatement
      this.checkPromotionsNow();

      // Puis toutes les minutes
      interval(60000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
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
      return this.http
        .get<boolean>(`${this.apiUrl}/panier/check-promotions`, {
          headers: this.authState.getAuthHeaders(),
        })
        .pipe(
          catchError((err) => {
            console.error(
              'Erreur lors de la vérification des promotions:',
              err
            );
            return of(false);
          })
        );
    }
    // Sinon, on vérifie côté client
    else {
      return this.getServerCart().pipe(
        map((panier) => {
          if (!panier || !panier.items || panier.items.length === 0) {
            return false;
          }

          let updated = false;
          const now = new Date();

          // Vérifier chaque article du panier
          panier.items.forEach((item) => {
            if (item.bassin?.promotion) {
              const startDate = new Date(item.bassin.promotion.dateDebut);
              const endDate = new Date(item.bassin.promotion.dateFin);

              // Si l'état de la promotion a changé
              const shouldBeActive = now >= startDate && now <= endDate;
              if (shouldBeActive !== item.promotionActive) {
                item.promotionActive = shouldBeActive;
                item.tauxReduction = shouldBeActive
                  ? item.bassin.promotion.tauxReduction
                  : 0;
                this.calculateEffectivePrix(item);
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
        catchError((err) => {
          console.error('Erreur lors de la vérification des promotions:', err);
          return of(false);
        })
      );
    }
  }

  calculateEffectivePrix(item: PanierItem): void {
    if (!item) return;
  
    // Pour les articles personnalisés
    if (item.isCustomized) {
      // Utiliser le prix estimé s'il existe
      if (item.customProperties?.prixEstime !== undefined) {
        item.effectivePrice = item.customProperties.prixEstime;
      } 
      // Sinon calculer à partir des composants
      else {
        item.effectivePrice = (item.prixOriginal || 0) +
                            (item.customization!.prixMateriau || 0) +
                            (item.customization!.prixDimension || 0) +
                            (item.prixAccessoires || 0);
      }
    }
    // Pour les articles standards avec promotion
    else if (item.promotionActive && item.tauxReduction) {
      item.effectivePrice = this.calculateDiscountedPrice(
        item.prixOriginal || 0,
        item.tauxReduction
      );
    }
    // Par défaut utiliser le prix original
    else {
      item.effectivePrice = item.prixOriginal || 0;
    }
  
    // Calculer le sous-total
    item.subtotal = item.effectivePrice * (item.quantity || 1);
  }
  
  private calculateDiscountedPrice(basePrice: number, reductionRate?: number): number {
    if (!reductionRate) return basePrice;
    return Math.round(basePrice * (1 - reductionRate / 100) * 100) / 100;
  }

  refreshCart(): Observable<Panier> {
    return this.http
      .get<Panier>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(
        tap((panier) => {
          if (panier?.items) {
            panier.items.forEach((item) => this.enrichItemWithDetails(item));
          }
          this.panierSubject.next(panier);
        }),
        catchError((error) => {
          console.error('Error refreshing cart:', error);
          return of(this.panierSubject.getValue());
        })
      );
  }
  /**
   * Force une actualisation complète du panier depuis le serveur ou le stockage local
   */
  forceRefreshCart(): Observable<Panier> {
    // Si l'utilisateur est connecté
    if (this.authState.isLoggedIn) {
      return this.http
        .get<Panier>(this.apiUrl, {
          headers: this.getHeaders(),
        })
        .pipe(
          tap((panier) => {
            // Mettre à jour l'état des promotions
            if (panier && panier.items) {
              panier.items.forEach((item) => this.calculateEffectivePrix(item));
            }
            this.panierSubject.next(panier);
          }),
          catchError((err) => {
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

        localCart.items.forEach((item) => {
          if (item.bassin?.promotion) {
            const startDate = new Date(item.bassin.promotion.dateDebut);
            const endDate = new Date(item.bassin.promotion.dateFin);

            item.promotionActive = now >= startDate && now <= endDate;
            item.tauxReduction = item.promotionActive
              ? item.bassin.promotion.tauxReduction
              : 0;
            this.calculateEffectivePrix(item);
          }
        });

        this.saveLocalCartWithExpiration(localCart);
        this.panierSubject.next(localCart);
      }

      return of(localCart);
    }
  }

  /**
   * Vérifie périodiquement les promotions dans le panier
   */
  private checkPromotionsPeriodically(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Vérifie immédiatement
    this.checkPromotionsNow();

    // Puis toutes les minutes
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
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

    updatedCart.items.forEach((item) => {
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

          this.calculateEffectivePrix(item);
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
      map((panier) => {
        const hadPromotions =
          panier.items?.some((item) => item.promotionActive) || false;
        return hadPromotions;
      })
    );
  }
/********************
 * 
 * 
 * 
 * 
 * 
 * 
 */
addItemToLocalCartOptimistic(item: {
  bassin: Bassin | BassinPersonnalise;
  quantity: number;
  isCustomized: boolean;
  customProperties?: any;
}): void {
  this.lastCartState = this.panierSubject.getValue();

  const prixUnitaire = item.isCustomized
    ? (item.bassin as BassinPersonnalise).prixEstime || item.bassin.prix
    : item.bassin.prix;

  const newItem: PanierItem = {
    id: Math.floor(Math.random() * 1000000),
    bassinId: item.bassin.idBassin,
    quantity: item.quantity,
    prixOriginal: item.bassin.prix,
    prixUnitaire: prixUnitaire,
    effectivePrice: prixUnitaire,
    isCustomized: item.isCustomized,
    customProperties: item.customProperties,
    status: item.isCustomized
      ? 'SUR_COMMANDE'
      : (item.bassin as Bassin).statut,
    surCommande: item.isCustomized || (item.bassin as Bassin).statut === 'SUR_COMMANDE',
    bassin: item.isCustomized ? undefined : (item.bassin as Bassin),
    dureeFabrication: item.isCustomized
      ? item.customProperties?.dureeFabrication
      : (item.bassin as Bassin).dureeFabricationJours?.toString(),
    nomBassin: item.isCustomized
      ? `${(item.bassin as Bassin).nomBassin} Personnalisé`
      : (item.bassin as Bassin).nomBassin,
    imageUrl: item.isCustomized
      ? (item.bassin as Bassin).imagesBassin?.[0]?.imagePath ||
      'assets/default-image.webp'
      : (item.bassin as Bassin).imagesBassin?.[0]?.imagePath,
    prixAccessoires: 0,
    description: item.bassin.description || "Non spécifié",
    // Initialiser l'objet customization pour les articles personnalisés
    customization: item.isCustomized ? {
      
      materiauSelectionne: item.customProperties?.materiauSelectionne,
      prixMateriau: item.customProperties?.materiauPrice || 0,
      dimensionSelectionnee: item.customProperties?.dimensionSelectionnee,
      prixDimension: item.customProperties?.dimensionPrice || 0,
      couleurSelectionnee: item.customProperties?.couleurSelectionnee,
      prixEstime: item.customProperties?.prixEstime || prixUnitaire,
      dureeFabrication: item.customProperties?.dureeFabrication
    } : undefined
  };

  const currentCart = this.panierSubject.getValue();
  const updatedCart = {
    ...currentCart,
    items: [...currentCart.items, newItem],
    totalPrice:
      (currentCart.totalPrice || 0) + prixUnitaire * newItem.quantity,
  };

  this.panierSubject.next(updatedCart);
}
/*******
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */
  // Annulation de la mise à jour optimiste
  revertLocalCart(): void {
    if (this.lastCartState) {
      this.panierSubject.next({
        ...this.lastCartState,
        totalPrice: this.calculateTotalPrice(this.lastCartState.items),
      });
      this.lastCartState = null;
    }
  }
  getBassinDetails(item: PanierItem): string {
    if (!item) return 'Aucun détail disponible';

    const details = [];

    // Pour les produits personnalisés
    if (item.isCustomized && item.customProperties) {
      if (item.customProperties.dimensionSelectionnee) {
        details.push(
          `Dimensions: ${item.customProperties.dimensionSelectionnee}`
        );
      }
      if (item.customProperties.couleurSelectionnee) {
        details.push(`Couleur: ${item.customProperties.couleurSelectionnee}`);
      }
      if (item.customProperties.materiauSelectionne) {
        details.push(`Matériau: ${item.customProperties.materiauSelectionne}`);
      }
    }
    // Pour les produits standards
    else {
      // Utiliser soit les champs directs, soit les propriétés personnalisées
      const nomBassin = item.nomBassin || item.customProperties?.nomBassin;
      const dimensions = item.dimensions || item.customProperties?.dimensions;
      const materiau = item.materiau || item.customProperties?.materiau;
      const couleur = item.couleur || item.customProperties?.couleur;

      if (nomBassin) details.push(`Bassin: ${nomBassin}`);
      if (dimensions) details.push(`Dimensions: ${dimensions}`);
      if (materiau) details.push(`Matériau: ${materiau}`);
      if (couleur) details.push(`Couleur: ${couleur}`);
    }

    // Durée de fabrication
    if (item.status === 'SUR_COMMANDE') {
      const duree =
        item.dureeFabrication || item.customProperties?.dureeFabrication;
      if (duree) details.push(`Délai: ${duree}`);
    }

    return details.filter(Boolean).join(' • ') || 'Détails non spécifiés';
  }

  hasIdenticalCustomBassin(newItem: PanierItemRequest): boolean {
    const existing = this.panierSubject.value.items?.find(item => {
      // Vérifier si c'est un bassin personnalisé avec le même bassinId
      if (!item.isCustomized || item.bassinId !== newItem.bassinId) {
        return false;
      }
      
      // Vérifier si toutes les personnalisations sont identiques
      const sameMaterial = item.customization?.materiauSelectionne === newItem.materiauSelectionne;
      const sameDimensions = item.customization?.dimensionSelectionnee === newItem.dimensionSelectionnee;
      const sameColor = item.customization?.couleurSelectionnee === newItem.couleurSelectionnee;
      const sameAccessories = this.areAccessoiresIdentical(item.accessoireIds, newItem.accessoireIds);
      
      return sameMaterial && sameDimensions && sameColor && sameAccessories;
    });
    
    return !!existing;
  }

private areAccessoiresIdentical(ids1?: number[], ids2?: number[]): boolean {
  if (!ids1 && !ids2) return true;
  if (!ids1 || !ids2) return false;
  if (ids1.length !== ids2.length) return false;
  
  // Trier les deux tableaux pour comparer les valeurs
  const sorted1 = [...ids1].sort();
  const sorted2 = [...ids2].sort();
  
  return sorted1.every((id, index) => id === sorted2[index]);
}
// Remplacer currentCart par panierSubject
get currentCart(): BehaviorSubject<Panier> {
  return this.panierSubject;
}


}
