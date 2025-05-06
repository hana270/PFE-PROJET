import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { PanierItem } from '../../../core/models/panier-item.model';
import { User } from '../../../core/models/user.model';
import { CartService } from '../../../core/services/cart.service';
import { CommandeService } from '../../../core/services/commande.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { BassinService } from '../../../core/services/bassin.service';
import { of, switchMap, finalize, catchError } from 'rxjs';
import {
  CommandeResponse,
  CreationCommandeRequest,
} from '../../../core/models/commande.models';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css'],
})
export class CheckoutComponent implements OnInit {
  clientInfoForm!: FormGroup;
  checkoutForm!: FormGroup;
  isLoading = false;
  cartItems: PanierItem[] = [];
  total = 0;
  vatRate = 0.19;
  vatAmount = 0;
  subtotal = 0;
  shippingCost = 20; // Frais de livraison fixe (20 DT)
  currentStep = 'info';
  userData: User | null = null;

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

  regions = [
    'Tunis',
    'Sfax',
    'Sousse',
    'Nabeul',
    'Bizerte',
    'Gabès',
    'Ariana',
    'Autre',
  ];
  submissionAttempted = false;
  backendError = '';

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private commandeService: CommandeService,

    private bassinService: BassinService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/checkout' },
      });
      return;
    }
    this.loadData();
  }

  private initForms(): void {
    this.clientInfoForm = this.fb.group({
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    });

    this.checkoutForm = this.fb.group({
      adresseLivraison: ['', [Validators.required, Validators.maxLength(200)]],
      codePostal: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      ville: ['', [Validators.required, Validators.maxLength(50)]],
      region: ['', [Validators.required]],
      commentaires: [''],
      modeLivraison: ['STANDARD', [Validators.required]],
    });
  }

  private loadData(): void {
    this.isLoading = true;
    this.cartService.getCartItems().subscribe({
      next: (items: PanierItem[]) => {
        this.cartItems = items;
        if (this.cartItems.length === 0) {
          this.toastService.showError('Votre panier est vide');
          this.router.navigate(['/cart']);
          return;
        }

        const customBassinIds = this.cartItems
          .filter((item) => item.isCustomized)
          .map((item) => item.bassinId);

        if (customBassinIds.length > 0) {
          this.loadManufacturingTimes(customBassinIds);
        } else {
          this.calculateTotals();
          this.loadUserData();
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.showError(
          'Erreur panier',
          err.message || 'Impossible de charger votre panier'
        );
      },
    });
  }

  private loadManufacturingTimes(bassinIds: number[]): void {
    const requests = bassinIds.map((id) =>
      this.bassinService.getBassinDetails(id).subscribe({
        next: (bassin) => {
          const cartItem = this.cartItems.find(
            (item) => item.bassinId === bassin.idBassin
          );
          if (cartItem) {
            cartItem.dureeFabrication = bassin.dureeFabricationDisplay || '7';
          }
        },
        error: (err: any) => {
          console.error(
            `Error loading manufacturing time for bassin ${id}:`,
            err
          );
        },
      })
    );

    setTimeout(() => {
      this.calculateTotals();
      this.loadUserData();
    }, 500);
  }

  private loadUserData(): void {
    const userEmail = this.authService.getUserEmail();

    if (userEmail) {
      const token = this.authService.getToken();
      const decodedToken = this.authService.decodeJWTToken(token);

      if (decodedToken) {
        const user: User = {
          user_id: decodedToken.userId || decodedToken.sub,
          email: decodedToken.email,
          firstName: decodedToken.firstName || decodedToken.given_name || '',
          lastName: decodedToken.lastName || decodedToken.family_name || '',
          phone: decodedToken.phone || '',
          defaultAddress: decodedToken.defaultAddress || '',
          username: '',
          roles: [],
        };

        this.userData = user;
        this.patchUserData(user);
      }
    }

    this.isLoading = false;
  }

  private patchUserData(user: User): void {
    this.clientInfoForm.patchValue({
      lastName: user.lastName || '',
      firstName: user.firstName || '',
      email: user.email || '',
      phone: user.phone || '',
    });

    if (user.defaultAddress) {
      const addressParts = user.defaultAddress.split(',');
      if (addressParts.length >= 3) {
        this.checkoutForm.patchValue({
          adresseLivraison: addressParts[0].trim(),
          codePostal: addressParts[1].trim().split(' ')[0],
          ville: addressParts[1].trim().split(' ').slice(1).join(' '),
          region: addressParts[2].trim() || 'Tunis',
        });
      }
    }
  }

  calculateTotals(): void {
    this.subtotal = this.cartItems.reduce(
      (total, item) => total + item.effectivePrice * item.quantity,
      0
    );
    this.vatAmount = this.subtotal * this.vatRate;
    this.shippingCost = 20;
    this.total = this.subtotal + this.vatAmount + this.shippingCost;
  }

  onSubmitClientInfo(): void {
    this.submissionAttempted = true;

    if (this.clientInfoForm.invalid) {
      this.markFormGroupTouched(this.clientInfoForm);
      this.showError('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const hasCustomBassin = this.cartItems.some(
      (item) => item.isCustomized || item.status === 'SUR_COMMANDE'
    );
    this.currentStep = hasCustomBassin ? 'bassin-details' : 'delivery';
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onSubmitBassinDetails(): void {
    this.currentStep = 'delivery';
  }

  onSubmitDelivery(): void {
    this.submissionAttempted = true;
    this.backendError = '';

    if (this.checkoutForm.invalid) {
      this.markFormGroupTouched(this.checkoutForm);
      this.showError('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isLoading = true;
    this.createOrderAndProceedToPayment();
  }
  private createOrderAndProceedToPayment(): void {
    // 1. Validation initiale
    if (!this.validateCheckoutPreconditions()) {
      return;
    }

    // 2. Préparation UI
    this.showProcessingLoader();

    // 3. Construction de la requête
    const commandeRequest = this.buildCommandeRequest();

    // 4. Appel du service
    this.commandeService
      .creerCommande(commandeRequest)
      .pipe(finalize(() => this.cleanupLoadingState()))
      .subscribe({
        next: (response) =>
          this.handleOrderSuccess(response, commandeRequest.clientId),
        error: (err) => this.handleOrderError(err),
      });
  }

  // Méthodes auxiliaires décomposées pour une meilleure lisibilité

  private validateCheckoutPreconditions(): boolean {
    if (!this.userData?.user_id) {
      this.isLoading = false;
      this.showError(
        'Erreur',
        'Utilisateur non identifié. Veuillez vous reconnecter.'
      );
      return false;
    }

    if (this.cartItems.length === 0) {
      this.isLoading = false;
      this.showError(
        'Panier vide',
        'Votre panier est vide. Veuillez ajouter des produits.'
      );
      this.router.navigate(['/cart']);
      return false;
    }

    return true;
  }

  private showProcessingLoader(): void {
    this.isLoading = true;
    Swal.fire({
      title: 'Traitement en cours',
      html: 'Création de votre commande...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      backdrop: true,
    });
  }

  private buildCommandeRequest(): CreationCommandeRequest {
    // Récupérer l'ID du panier actuel
    const panierId = this.cartService.getCurrentCartIdw();

    // Vérification approfondie de user_id
    if (!this.userData?.user_id) {
      throw new Error(
        'ID utilisateur manquant - impossible de créer la commande'
      );
    }

    return {
      clientId: String(this.userData.user_id),
      panierId: panierId || 0, // Conversion en number
      clientNom: this.getFormValue('lastName'),
      clientPrenom: this.getFormValue('firstName'),
      clientEmail: this.getFormValue('email'),
      clientTelephone: this.getFormValue('phone'),
      adresseLivraison: this.getFormValue('adresseLivraison'),
      codePostal: this.getFormValue('codePostal'),
      ville: this.getFormValue('ville'),
      region: this.getFormValue('region'),
      modeLivraison: this.getFormValue('modeLivraison', 'STANDARD'),
      commentaires: this.getFormValue('commentaires', ''),
      items: this.cartItems.map((item) => this.mapCartItemToDTO(item)),
    };
  }

  // Version améliorée de getFormValue avec typage strict
  private getFormValue(controlName: string, defaultValue: string = ''): string {
    const control =
      this.clientInfoForm.get(controlName) ||
      this.checkoutForm.get(controlName);
    return control?.value !== undefined && control?.value !== null
      ? String(control.value)
      : defaultValue;
  }

  private handleOrderSuccess(
    response: CommandeResponse,
    clientId: string
  ): void {
    if (!response?.commande?.id) {
      throw new Error('Réponse du serveur invalide');
    }

    const paymentData = this.buildPaymentData(response, clientId);
    this.persistPaymentData(paymentData);
    this.navigateToPayment(paymentData);
    this.showSuccessNotification();
  }

  private buildPaymentData(response: CommandeResponse, clientId: string): any {
    return {
      commandeId: response.commande.id?.toString(),
      commandeNumero: response.commande.numeroCommande,
      totalAmount: this.total,
      clientInfo: {
        id: clientId,
        email: this.clientInfoForm.get('email')?.value || '',
        firstName: this.clientInfoForm.get('firstName')?.value || '',
        lastName: this.clientInfoForm.get('lastName')?.value || '',
        phone: this.clientInfoForm.get('phone')?.value || '',
      },
      cartItems: this.cartItems.map((item) => this.mapCartItemToDTO(item)),
      deliveryInfo: {
        adresseLivraison:
          this.checkoutForm.get('adresseLivraison')?.value || '',
        codePostal: this.checkoutForm.get('codePostal')?.value || '',
        ville: this.checkoutForm.get('ville')?.value || '',
        region: this.checkoutForm.get('region')?.value || '',
        commentaires: this.checkoutForm.get('commentaires')?.value || '',
        modeLivraison:
          this.checkoutForm.get('modeLivraison')?.value || 'STANDARD',
      },
      orderDetails: {
        subtotal: this.subtotal,
        vatAmount: this.vatAmount,
        shippingCost: this.shippingCost,
        total: this.total,
      },
    };
  }

  private persistPaymentData(paymentData: any): void {
    try {
      sessionStorage.setItem('currentPaymentData', JSON.stringify(paymentData));
      localStorage.setItem('lastSuccessfulOrder', JSON.stringify(paymentData));
    } catch (e) {
      console.error('Erreur de stockage:', e);
    }
  }

  private navigateToPayment(paymentData: any): void {
    this.router
      .navigate(['/payment/card'], {
        state: { paymentData },
        replaceUrl: true,
      })
      .catch((err) => {
        console.error('Échec de navigation:', err);
        this.router.navigate(['/payment/card'], {
          queryParams: { fallback: 'true' },
        });
      });
  }

  private showSuccessNotification(): void {
    Swal.fire({
      title: 'Succès!',
      text: 'Votre commande a été créée',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true,
    });
  }

  private handleOrderError(err: any): void {
    const errorMessage = this.extractErrorMessage(err);
    console.error('Erreur création commande:', err);

    Swal.fire({
      title: 'Erreur',
      html: `<p>${errorMessage}</p>`,
      icon: 'error',
      willClose: () => {
        this.router.navigate(['/checkout']);
      },
    });
  }

  private extractErrorMessage(err: any): string {
    if (err?.error?.message) {
      return err.error.message;
    }
    if (err?.message) {
      return err.message;
    }
    return 'Une erreur inattendue est survenue. Veuillez réessayer.';
  }

  private cleanupLoadingState(): void {
    this.isLoading = false;
    Swal.close();
  }

  private handleOrderCreationError(error: HttpErrorResponse): Error {
    console.error('Erreur création commande:', error);

    let errorMessage = 'Erreur lors de la création de la commande';

    if (error.status === 0) {
      errorMessage =
        'Impossible de se connecter au serveur. Vérifiez votre connexion.';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Données de commande invalides';
    } else if (error.status === 401) {
      errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      this.authService.logout();
      this.router.navigate(['/login']);
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.backendError = error.status.toString();
    return new Error(errorMessage);
  }

  private showSuccessAndRedirect(message: string, redirectTo: string): void {
    Swal.fire({
      title: 'Succès!',
      text: message,
      icon: 'success',
      showConfirmButton: true,
      confirmButtonText: 'OK',
      timer: 3000,
      timerProgressBar: true,
      willClose: () => {
        this.router.navigate([redirectTo]);
      },
    });
  }

  showError(title: string, message: string): void {
    Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonText: 'OK',
    });
  }

  private mapCartItemToDTO(item: PanierItem): any {
    return {
      bassinId: item.bassinId,
      nomBassin: item.nomBassin,
      description: item.description,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      prixOriginal: item.prixOriginal,
      effectivePrice: item.effectivePrice,
      isCustomized: item.isCustomized,
      status: item.status,
      materiauSelectionne: item.customization?.materiauSelectionne,
      prixMateriau: item.customization?.prixMateriau,
      dimensionSelectionnee: item.customization?.dimensionSelectionnee,
      prixDimension: item.customization?.prixDimension,
      couleurSelectionnee: item.customization?.couleurSelectionnee,
      dureeFabrication: item.dureeFabrication,
      orderDetails: item.orderDetails,
      accessoires: item.accessoires?.map((acc) => ({
        accessoireId: acc.idAccessoire,
        nomAccessoire: acc.nomAccessoire,
        prixAccessoire: acc.prixAccessoire,
        imageUrl: acc.imageUrl,
      })),
    };
  }

  getBassinStatusLabel(status: string): string {
    switch (status) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'SUR_COMMANDE':
        return 'Sur commande';
      case 'RUPTURE_STOCK':
        return 'Rupture de stock';
      default:
        return status;
    }
  }

  hasCustomOrSpecialOrderItems(): boolean {
    return this.cartItems.some(
      (item) => item.isCustomized || item.status === 'SUR_COMMANDE'
    );
  }

  getDeliveryStepNumber(): string {
    return this.hasCustomOrSpecialOrderItems() ? '3' : '2';
  }

  goBack(): void {
    switch (this.currentStep) {
      case 'delivery':
        this.currentStep = this.hasCustomOrSpecialOrderItems()
          ? 'bassin-details'
          : 'info';
        break;
      case 'bassin-details':
        this.currentStep = 'info';
        break;
      default:
        break;
    }
  }

  // Helper method to check backend status
  checkBackendStatus(): void {
    this.commandeService.checkBackendStatus().subscribe({
      next: () => {
        // Backend is available, proceed with order creation
        this.createOrderAndProceedToPayment();
      },
      error: (err) => {
        // Backend is not available
        this.showError(
          'Service indisponible',
          'Le service de commandes est actuellement indisponible. Veuillez réessayer plus tard.'
        );
        this.isLoading = false;
      },
    });
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
  // Obtient le nom correct de l'item
  getItemName(item: PanierItem): string {
    if (item.isCustomized) {
      return item.customProperties?.bassinBase?.nom
        ? `${item.customProperties.bassinBase.nom} (Personnalisé)`
        : 'Bassin personnalisé';
    }
    return item.bassin?.nomBassin || item.nomBassin || 'Bassin';
  }
}
