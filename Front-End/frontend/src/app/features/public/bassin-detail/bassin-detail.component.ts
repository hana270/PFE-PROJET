import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { NgZone } from '@angular/core';
import * as QRCode from 'qrcode';
import { ModelViewerElement } from '@google/model-viewer';
import { lastValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { Bassin } from '../../../core/models/bassin.models';
import { BassinService } from '../../../core/services/bassin.service';
import { CartService } from '../../../core/services/cart.service';
import { ArService } from '../../../core/services/ar.service';
import { Avis, HistoriqueModification } from '../../../core/models/avis.models';
import { AvisService } from '../../../core/services/avis.service';
import { Promotion } from '../../../core/models/promotion.model';
import {
  PanierItem,
  PanierItemRequest,
} from '../../../core/models/panier-item.model';
import { ToastService } from '../../../core/services/toast.service';
import {
  catchError,
  finalize,
  interval,
  map,
  Observable,
  of,
  Subject,
  Subscription,
  switchMap,
  takeUntil,
  throwError,
  timeout,
} from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Accessoire } from '../../../core/models/accessoire.models';
import { InsufficientStockError } from '../../../core/errors/insufficient-stock.error';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Panier } from '../../../core/models/panier.model';

import { forwardRef } from '@angular/core';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-bassin-detail',
  templateUrl: './bassin-detail.component.html',
  styleUrls: ['./bassin-detail.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '0.4s ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '0.3s ease-in',
          style({ opacity: 0, transform: 'translateY(20px)' })
        ),
      ]),
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('0.5s ease-out', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('0.4s ease-in', style({ transform: 'translateX(-100%)' })),
      ]),
    ]),
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BassinDetailComponent implements OnInit {
  bassin: Bassin | undefined;
  selectedImage: string | undefined;
  isZoomed: boolean = false;
  imagePreviews: string[] = [];
  customizationForm: FormGroup;
  isCustomizing: boolean = false;
  customizationStep: number = 1;
  totalSteps: number = 4;
  isCustomizationComplete: boolean = false;
  customizationSummary: any = {};

  isBrowser: boolean = false;
  isAddingToCart = false;
  // Options configurées par l'admin
  listeMateriaux: string[] = [];
  listeDimensions: string[] = [];
  listeAccessoires: any[] = [];

  // Mapping des images pour les matériaux
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

  // Prix des matériaux
  prixMateriaux: { [key: string]: number } = {
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

  prixDimensions: { [key: string]: number } = {
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

  // Palette de couleurs regroupées par catégorie
  colorPalette = {
    blues: [
      '#1976D2',
      '#1E88E5',
      '#2196F3',
      '#42A5F5',
      '#64B5F6',
      '#90CAF9',
      '#BBDEFB',
      '#E3F2FD',
    ],
    greens: [
      '#2E7D32',
      '#388E3C',
      '#43A047',
      '#4CAF50',
      '#66BB6A',
      '#81C784',
      '#A5D6A7',
      '#E8F5E9',
    ],
    reds: [
      '#C62828',
      '#D32F2F',
      '#E53935',
      '#F44336',
      '#EF5350',
      '#E57373',
      '#EF9A9A',
      '#FFEBEE',
    ],
    grays: [
      '#212121',
      '#424242',
      '#616161',
      '#757575',
      '#9E9E9E',
      '#BDBDBD',
      '#E0E0E0',
      '#EEEEEE',
    ],
    browns: [
      '#5D4037',
      '#6D4C41',
      '#795548',
      '#8D6E63',
      '#A1887F',
      '#BCAAA4',
      '#D7CCC8',
      '#EFEBE9',
    ],
    purples: [
      '#7B1FA2',
      '#8E24AA',
      '#9C27B0',
      '#AB47BC',
      '#BA68C8',
      '#CE93D8',
      '#E1BEE7',
      '#F3E5F5',
    ],
    yellows: [
      '#F57F17',
      '#F9A825',
      '#FBC02D',
      '#FFEB3B',
      '#FFEE58',
      '#FFF59D',
      '#FFF9C4',
      '#FFFDE7',
    ],
    cyans: [
      '#006064',
      '#00838F',
      '#0097A7',
      '#00BCD4',
      '#26C6DA',
      '#4DD0E1',
      '#80DEEA',
      '#E0F7FA',
    ],
  };

  // Couleur actuellement sélectionnée
  selectedColor: string = '';
  quantity: number = 1;
  //les varaibles ar
  qrCodeImageUrl: string | null = null;
  isLoading: boolean = false;
  isARActive: boolean = false;
  @ViewChild('modelViewer') modelViewer!: ModelViewerElement;

  avisForm!: FormGroup;
  isLoggedIn: boolean = false;
  username: string = '';

  avisList: Avis[] = []; // Liste des avis
  currentPage: number = 1; // Page actuelle pour la pagination
  itemsPerPage: number = 4; // Nombre d'avis par page
  editingAvis: Avis | null = null; // Avis en cours de modification

  showMaterialError = false;

  private timeLeftSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();

  timeLeftForPromo: any = null;
  private timer: any;

  widthValue: number = 41.7;
  stableWidth: string = '41.7%';

  private updateTimeout: any;

  constructor(
    private route: ActivatedRoute,
    private cartService: CartService,
    public router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private arService: ArService,
    private avisService: AvisService,
    private jwtHelper: JwtHelperService,
    @Inject(forwardRef(() => AuthStateService))
    private authState: AuthStateService,
    private http: HttpClient,
    private toastService: ToastService,
    @Inject(forwardRef(() => BassinService))
    private bassinService: BassinService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Initialize widthValue with a sensible default or based on initial data
    this.customizationForm = this.fb.group({
      length: ['', [Validators.required, Validators.min(1)]],
      width: ['', [Validators.required, Validators.min(1)]],
      depth: ['', [Validators.required, Validators.min(1)]],
      couleur: ['bleu', Validators.required],
      materiau: ['beton', Validators.required],
      options: [''],
    });
  }

  ngOnInit(): void {
    this.cartService.forceRefreshCart().subscribe({
      next: (cart) => console.log('Panier rafraîchi:', cart),
      error: (err) =>
        console.error('Erreur lors du rafraîchissement du panier:', err),
    });

    const id = this.route.snapshot.paramMap.get('id');

    if (this.authState.isLoggedIn) {
      this.isLoggedIn = true;
      const token = this.authState.currentToken;
      if (token) {
        const decoded = this.jwtHelper.decodeToken(token);
        this.username = decoded.sub || ''; // 'sub' is typically the username in JWT
      }
    }

    this.avisForm = this.fb.group({
      nom: [
        { value: this.username || '', disabled: true },
        Validators.required,
      ],
      message: ['', Validators.required],
      note: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    });

    if (id) {
      this.loadBassinDetails(+id);
    }

    // Vérifier les promotions toutes les 30 secondes
    if (this.isBrowser) {
      interval(30000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.checkAndUpdatePromotion();
        });
    }

    this.cartService.forceRefreshCart().subscribe({
      next: (cart) => console.log('Panier rafraîchi:', cart),
      error: (err) =>
        console.error('Erreur lors du rafraîchissement du panier:', err),
    });
    // Run initial change detection once after all values are set
    setTimeout(() => {
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();

    if (this.timeLeftSubscription) {
      this.timeLeftSubscription.unsubscribe();
    }
    // Clear the interval when component is destroyed
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private updateWidth(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      const newWidth = this.calculateNewWidth();
      if (Math.abs(newWidth - this.widthValue) > 0.01) {
        this.widthValue = newWidth;
        this.stableWidth = `${newWidth}%`;
        this.cdr.markForCheck();
      }
    }, 50); // 50ms debounce
  }

  private calculateNewWidth(): number {
    // Implement your actual width calculation logic here
    // For example:
    if (!this.bassin) return 41.7;

    // Sample calculation - replace with your actual logic
    const baseWidth = 41.7;
    const promoFactor = this.bassin.promotionActive ? 1.1 : 1.0;
    return Math.round(baseWidth * promoFactor * 100) / 100;
  }

  ngAfterViewInit(): void {
    this.updateWidth();
  }

  ngAfterViewChecked(): void {
    this.updateWidth();
  }

  someExternalLibraryCallback(newWidth: number): void {
    this.ngZone.run(() => {
      this.widthValue = newWidth;
    });
  }

  checkPromotionStatus(): void {
    if (!this.bassin || !this.bassin.promotion) return;

    const now = new Date();
    const startDate = new Date(this.bassin.promotion.dateDebut);
    const endDate = new Date(this.bassin.promotion.dateFin);

    this.bassin.promotionActive = now >= startDate && now <= endDate;

    if (this.bassin.promotionActive) {
      this.bassin.prixPromo =
        this.bassin.prix * (1 - this.bassin.promotion.tauxReduction / 100);
      this.calculateTimeLeft(endDate);
    } else {
      this.bassin.prixPromo = this.bassin.prix;
    }
  }

  loadCustomizationOptions(idBassin: number): void {
    console.log(
      'Chargement des options de personnalisation pour le bassin',
      idBassin
    );
    this.bassinService.getBassinPersonnaliseOptions(idBassin).subscribe({
      next: (options) => {
        console.log('Options reçues:', options);
        // Vérifier si le bassin a des options de personnalisation
        const hasCustomizationOptions =
          (options.materiaux && options.materiaux.length > 0) ||
          (options.dimensions && options.dimensions.length > 0) ||
          (options.accessoires && options.accessoires.length > 0);

        // Assurez-vous que this.bassin existe avant de définir la propriété
        if (this.bassin) {
          this.bassin.hasCustomizationOptions = hasCustomizationOptions;
        }

        this.listeMateriaux = options.materiaux || [];
        this.listeDimensions = options.dimensions || [];
        this.listeAccessoires = options.accessoires || [];

        this.initCustomizationForm();

        // Force la détection de changement
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(
          'Erreur lors du chargement des options de personnalisation',
          err
        );
        // Marquer qu'il n'y a pas d'options de personnalisation
        if (this.bassin) {
          this.bassin.hasCustomizationOptions = false;
        }

        // Utiliser des valeurs par défaut vides
        this.listeMateriaux = [];
        this.listeDimensions = [];
        this.listeAccessoires = [];
        this.initCustomizationForm();

        // Force la détection de changement
        this.cdr.detectChanges();
      },
    });
  }

  initCustomizationForm(): void {
    this.customizationForm = this.fb.group({
      materiau: [this.listeMateriaux[0] || '', Validators.required],
      dimension: [this.listeDimensions[0] || '', Validators.required],
      couleur: ['#1976D2', Validators.required], // Couleur par défaut
      accessoires: [[]], // Liste vide pour les accessoires
    });

    // Initialiser la couleur sélectionnée
    this.selectedColor = '#1976D2';
  }

  loadAvis(idBassin: number): void {
    this.avisService.getAvisByBassin(idBassin).subscribe({
      next: (avis) => {
        this.avisList = avis.map((a) => ({
          ...a,
          historiqueModifications: a.historiqueModifications || [], // Initialisation
          showHistorique: false,
        }));
      },
      error: (err) => {
        console.error('Erreur lors du chargement des avis', err);
        Swal.fire('Erreur', 'Impossible de charger les avis.', 'error');
      },
    });
  }

  onSubmitAvis(): void {
    if (this.avisForm.valid) {
      // Forcer la valeur du nom avec le username
      this.avisForm.get('nom')?.setValue(this.username);

      const avis: Avis = this.avisForm.getRawValue(); // Utilisez getRawValue() pour inclure les champs désactivés
      const idBassin = this.route.snapshot.paramMap.get('id');

      if (idBassin) {
        if (this.isLoggedIn) {
          avis.nom = this.username;
        }

        this.avisService.addAvis(avis, +idBassin).subscribe({
          next: (newAvis) => {
            this.avisList.push(newAvis);
            this.avisForm.reset();
            if (this.isLoggedIn) {
              this.avisForm.get('nom')?.setValue(this.username);
            }
            Swal.fire(
              'Succès',
              'Votre avis a été ajouté avec succès!',
              'success'
            );
          },
          error: (error) => {
            console.error("Erreur lors de l'ajout de l'avis:", error);
            Swal.fire(
              'Erreur',
              "Une erreur est survenue lors de l'ajout de l'avis.",
              'error'
            );
          },
        });
      }
    }
  }

  editAvis(avis: Avis): void {
    this.editingAvis = avis;
    this.avisForm.patchValue({
      nom: this.username,
      message: avis.message,
      note: avis.note,
    });
  }

  cancelEdit(): void {
    this.editingAvis = null;
    this.avisForm.reset();
  }

  updateAvis(): void {
    if (this.editingAvis && this.avisForm.valid) {
      // Créer l'objet de modification pour l'historique
      const modification: HistoriqueModification = {
        ancienneNote: this.editingAvis.note,
        ancienMessage: this.editingAvis.message,
        ancienNom: this.editingAvis.nom,
        dateModification: new Date().toISOString(),
      };

      // Mettre à jour l'avis avec les nouvelles valeurs
      const updatedAvis: Avis = {
        ...this.avisForm.getRawValue(),
        idAvis: this.editingAvis.idAvis,
        userId: this.editingAvis.userId,
        dateSoumission: this.editingAvis.dateSoumission,
        // Ajouter la modification à l'historique
        historiqueModifications: [
          ...(this.editingAvis.historiqueModifications || []),
          modification,
        ],
      };

      this.avisService
        .updateAvis(this.editingAvis.idAvis, updatedAvis)
        .subscribe({
          next: (updated) => {
            const index = this.avisList.findIndex(
              (a) => a.idAvis === this.editingAvis!.idAvis
            );
            if (index !== -1) {
              // Mettre à jour l'avis dans la liste avec la réponse du serveur
              this.avisList[index] = updated;
            }
            this.editingAvis = null;
            this.avisForm.reset();
            this.avisForm.get('nom')?.setValue(this.username); // Réinitialiser le nom
            Swal.fire(
              'Succès',
              'Votre avis a été mis à jour avec succès!',
              'success'
            );
          },
          error: (error) => {
            console.error("Erreur lors de la mise à jour de l'avis:", error);
            let errorMessage = 'Une erreur est survenue';
            if (error.status === 403) {
              errorMessage = "Vous n'êtes pas autorisé à modifier cet avis";
            } else if (error.status === 404) {
              errorMessage = 'Avis non trouvé';
            }
            Swal.fire('Erreur', errorMessage, 'error');
          },
        });
    }
  }
  deleteAvis(idAvis: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: 'Vous ne pourrez pas revenir en arrière!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.avisService.deleteAvis(idAvis).subscribe({
          next: () => {
            this.avisList = this.avisList.filter((a) => a.idAvis !== idAvis);
            Swal.fire('Supprimé!', 'Votre avis a été supprimé.', 'success');
          },
          error: (error) => {
            console.error("Erreur lors de la suppression de l'avis:", error);
            let errorMessage = 'Une erreur est survenue';

            if (error.status === 403) {
              errorMessage = "Vous n'êtes pas autorisé à supprimer cet avis";
            } else if (error.status === 404) {
              errorMessage = 'Avis non trouvé';
            }

            Swal.fire('Erreur', errorMessage, 'error');
          },
        });
      }
    });
  }

  // Pagination
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  get totalPages(): number {
    return Math.ceil(this.avisList.length / this.itemsPerPage);
  }

  get paginatedAvis(): Avis[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.avisList.slice(startIndex, startIndex + this.itemsPerPage);
  }

  isCurrentUserAuthor(avis: Avis): boolean {
    if (!this.isLoggedIn) return false;

    // Vérifier d'abord par le nom (pour la rétrocompatibilité)
    if (avis.nom === this.username) return true;

    // Ensuite vérifier par l'ID utilisateur si disponible
    const userId = this.authState.currentUserId;

    return avis.userId === userId;
  }

  // Méthode pour sélectionner un matériau
  selectMaterial(materiau: string): void {
    this.customizationForm.get('materiau')?.setValue(materiau);
  }

  // Méthode pour sélectionner une dimension
  selectDimension(dimension: string): void {
    this.customizationForm.get('dimension')?.setValue(dimension);
  }

  // Méthode pour basculer un accessoire (sélectionner/désélectionner)
  toggleAccessoire(accessoire: any): void {
    const accessoires = this.customizationForm.get('accessoires')?.value || [];
    const index = accessoires.findIndex(
      (a: any) => a.idAccessoire === accessoire.idAccessoire
    );

    if (index === -1) {
      // Sélectionner l'accessoire s'il n'est pas déjà sélectionné
      accessoires.push(accessoire);
    } else {
      // Désélectionner l'accessoire s'il est déjà sélectionné
      accessoires.splice(index, 1);
    }

    this.customizationForm.get('accessoires')?.setValue(accessoires);
  }

  // Méthode pour vérifier si un accessoire est sélectionné
  isAccessoireSelected(accessoire: any): boolean {
    const accessoires = this.customizationForm.get('accessoires')?.value || [];
    return accessoires.some(
      (a: any) => a.idAccessoire === accessoire.idAccessoire
    );
  }

  getFirstImage(item: PanierItem): string {
    if (!item) return 'assets/default-image.webp';

    // Pour les items personnalisés
    if (item.isCustomized) {
      // Si une image est spécifiée dans les propriétés personnalisées
      if (item.customProperties?.imageUrl) {
        return item.customProperties.imageUrl;
      }

      // Vérifier si customProperties et materiau existent
      if (item.customProperties?.materiau) {
        const materialImage =
          this.materiauxImages[item.customProperties.materiau];
        if (materialImage) {
          return materialImage;
        }
      }

      return 'assets/default-image.webp';
    }

    // Pour les bassins standards
    if (item.bassin?.imagesBassin?.[0]?.imagePath) {
      try {
        return `${
          this.bassinService.apiURL
        }/imagesBassin/getFS/${encodeURIComponent(
          item.bassin.imagesBassin[0].imagePath
        )}`;
      } catch (e) {
        console.error('Error encoding image path:', e);
        return 'assets/default-image.webp';
      }
    }

    return 'assets/default-image.webp';
  }
  handleImageError(
    event: any,
    item: Partial<PanierItem> & { imageUrl?: string }
  ): void {
    console.error('Error loading image for item:', item);
    const target = event.target as HTMLImageElement;

    if (item?.isCustomized) {
      target.src = 'assets/default-image.webp';
    } else if (item?.bassin) {
      target.src = 'assets/default-image.webp';
    } else {
      target.src = 'assets/default-image.webp';
    }
  }

  getDisplayDetails(item: PanierItem): string {
    const details: string[] = [];

    // Custom items
    if (item.isCustomized && item.customProperties) {
      details.push(
        `Personnalisé: ${
          item.customProperties.bassinBase?.nom || item.nomBassin
        }`
      );

      if (
        item.customProperties.materiauSelectionne ||
        item.customProperties.materiau
      ) {
        details.push(
          `Matériau: ${
            item.customProperties.materiauSelectionne ||
            item.customProperties.materiau
          }`
        );
      }

      if (
        item.customProperties.dimensionSelectionnee ||
        item.customProperties.dimensions
      ) {
        details.push(
          `Dimensions: ${
            item.customProperties.dimensionSelectionnee ||
            item.customProperties.dimensions
          }`
        );
      }

      if (
        item.customProperties.couleurSelectionnee ||
        item.customProperties.couleur
      ) {
        details.push(
          `Couleur: ${
            item.customProperties.couleurSelectionnee ||
            item.customProperties.couleur
          }`
        );
      }

      if (item.customProperties.dureeFabrication) {
        details.push(
          `Fabrication: ${item.customProperties.dureeFabrication} jours`
        );
      }

      // Accessoires
      if (item.customProperties.accessoires!.length > 0) {
        const accessoiresCount = item.customProperties.accessoires!.length;
        details.push(`Accessoires (${accessoiresCount})`);
      }
    }
    // Standard items
    else if (item.bassin) {
      details.push(item.bassin.nomBassin);
      if (item.bassin.dimensions)
        details.push(`Dimensions: ${item.bassin.dimensions}`);
      if (item.bassin.materiau)
        details.push(`Matériau: ${item.bassin.materiau}`);
      if (item.bassin.couleur) details.push(`Couleur: ${item.bassin.couleur}`);
      if (item.bassin.dureeFabricationDisplay)
        details.push(`Fabrication: ${item.bassin.dureeFabricationDisplay}`);
    }

    return details.join(' • ') || 'Détails non disponibles';
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

  /**********************************
 * 


 */
  //Hana Modifier cette methode
  startCustomization(): void {
    this.isCustomizing = true;
    this.customizationStep = 1;

    // Si aucune option n'a été chargée, utiliser les valeurs par défaut
    if (this.listeMateriaux.length === 0) {
      this.listeMateriaux = Object.keys(this.prixMateriaux);
    }
    if (this.listeDimensions.length === 0) {
      this.listeDimensions = Object.keys(this.prixDimensions);
    }

    // Initialiser les valeurs du formulaire avec les premières options disponibles
    this.customizationForm.patchValue({
      materiau: this.listeMateriaux[0],
      dimension: this.listeDimensions[0],
      couleur: this.selectedColor,
    });
  }

  cancelCustomization(): void {
    this.isCustomizing = false;
    this.customizationStep = 1;
    this.isCustomizationComplete = false;
    this.customizationForm.reset();
  }

  nextStep(): void {
    if (
      this.customizationStep === 1 &&
      !this.customizationForm.get('materiau')?.value
    ) {
      this.showMaterialError = true;
      return;
    }

    this.showMaterialError = false;

    if (this.isStepValid()) {
      if (this.customizationStep < this.totalSteps) {
        this.customizationStep++;
      } else {
        this.completeCustomization();
      }
    }
  }

  previousStep(): void {
    if (this.customizationStep > 1) {
      this.customizationStep--;
    } else {
      this.cancelCustomization();
    }
  }

  isStepValid(): boolean {
    if (this.customizationStep === 1) {
      // Vérifie qu'un matériau est sélectionné
      return !!this.customizationForm.get('materiau')?.value;
    } else if (this.customizationStep === 2) {
      // Vérifie qu'une dimension est sélectionnée
      return !!this.customizationForm.get('dimension')?.value;
    } else if (this.customizationStep === 3) {
      // Pour l'étape des accessoires, on peut toujours passer à l'étape suivante
      return true;
    } else if (this.customizationStep === 4) {
      // Vérifie qu'une couleur est sélectionnée
      return !!this.customizationForm.get('couleur')?.value;
    }
    return true;
  }

  completeCustomization(): void {
    this.isCustomizationComplete = true;

    const materiauPrix =
      this.prixMateriaux[this.customizationForm.value.materiau] || 0;
    const dimensionPrix =
      this.prixDimensions[this.customizationForm.value.dimension] || 0;
    const accessoiresPrix = this.customizationForm.value.accessoires.reduce(
      (sum: number, acc: Accessoire) => sum + (acc.prixAccessoire || 0),
      0
    );

    const prixTotal =
      (this.bassin?.prix || 0) + materiauPrix + dimensionPrix + accessoiresPrix;

    // Calculer la durée de fabrication en fonction des options choisies
    const baseDuration = 14; // 2 semaines de base
    const materialDuration = this.getMaterialDuration(
      this.customizationForm.value.materiau
    );
    const dimensionDuration = this.getDimensionDuration(
      this.customizationForm.value.dimension
    );
    const accessoriesDuration =
      this.customizationForm.value.accessoires.length * 2; // 2 jours par accessoire

    const totalDuration =
      baseDuration + materialDuration + dimensionDuration + accessoriesDuration;

    this.customizationSummary = {
      dimension: this.customizationForm.value.dimension,
      materiau: this.customizationForm.value.materiau,
      couleur: this.customizationForm.value.couleur,
      accessoires: [...this.customizationForm.value.accessoires],
      prixEstime: prixTotal,
      dureeFabrication: totalDuration, // Ajouter la durée calculée
    };
  }

  // Méthodes pour calculer la durée en fonction des options
  private getMaterialDuration(materiau: string): number {
    const durations: { [key: string]: number } = {
      'Béton fibré haute performance': 7,
      'Polyéthylène haute densité (PEHD)': 5,
      'Composite verre-résine': 10,
      // Ajouter les autres matériaux...
    };
    return durations[materiau] || 0;
  }

  private getDimensionDuration(dimension: string): number {
    // Logique pour calculer la durée en fonction de la dimension
    if (dimension.includes('150x100')) return 0;
    if (dimension.includes('180x120')) return 1;
    if (dimension.includes('200x150')) return 2;
    // Ajouter les autres dimensions...
    return 0;
  }

  // Méthode pour sélectionner une couleur
  selectColor(color: string): void {
    this.selectedColor = color;
    this.customizationForm.get('couleur')?.setValue(color);
  }

  onAccessoireChange(event: any, accessoire: any): void {
    const isChecked = event.target.checked;

    if (isChecked) {
      // Ajouter l'accessoire à la liste des accessoires sélectionnés
      this.customizationForm.get('accessoires')?.value.push(accessoire);
    } else {
      // Retirer l'accessoire de la liste des accessoires sélectionnés
      const accessoires = this.customizationForm.get('accessoires')?.value;
      const index = accessoires.indexOf(accessoire);
      if (index !== -1) {
        accessoires.splice(index, 1);
      }
    }
  }

  calculateCustomPrice(): number {
    if (!this.bassin) return 0;

    let basePrice = this.bassin.prix;
    const volume =
      this.customizationForm.value.length *
      this.customizationForm.value.width *
      this.customizationForm.value.depth;

    const volumeMultiplier = volume / 4; // Supposons 4m³ comme volume standard

    const materiauMultipliers: { [key: string]: number } = {
      beton: 1.0,
      fibre: 1.2,
      acier: 1.5,
      bois: 1.3,
    };

    const materiau = this.customizationForm.value.materiau;
    const materiauMultiplier = materiauMultipliers[materiau] || 1.0;

    return Math.round(basePrice * volumeMultiplier * materiauMultiplier);
  }

  calculateAverageRating(): number {
    if (this.avisList.length === 0) return 0; // Si aucun avis, retourne 0

    const total = this.avisList.reduce((sum, avis) => sum + avis.note, 0);
    return total / this.avisList.length;
  }

  toggleHistorique(avis: Avis): void {
    // Si l'historique n'est pas encore chargé, le charger ici
    if (!avis.historiqueModifications) {
      // Vous pourriez faire un appel API pour charger l'historique si nécessaire
      avis.historiqueModifications = [];
    }
    avis.showHistorique = !avis.showHistorique;
  }

// Méthode pour ajouter un bassin standard
async addToCart(): Promise<void> {
  if (!this.bassin) {
    await Swal.fire({
      title: 'Erreur',
      text: 'Bassin non disponible',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  // Vérification du stock
  if (this.bassin.statut === 'DISPONIBLE' && this.quantity > this.bassin.stock) {
    await Swal.fire({
      title: 'Stock insuffisant',
      html: `Il ne reste que <strong>${this.bassin.stock}</strong> unité(s) disponible(s)`,
      icon: 'warning',
      confirmButtonText: 'OK'
    });
    return;
  }

  this.isLoading = true;

  try {
    await lastValueFrom(
      this.cartService.addBassinToCart(
        this.bassin,
        this.quantity,
        this.bassin.promotionActive ? this.bassin.promotion : undefined
      ).pipe(timeout(3000))
    );

    const result = await Swal.fire({
      title: 'Parfait !',
      html: `${this.quantity} bassin(s) <strong>${this.bassin.nomBassin}</strong> ajouté(s) au panier`,
      icon: 'success',
      showConfirmButton: true,
      confirmButtonText: 'Aller au panier',
      showCancelButton: true,
      cancelButtonText: 'Continuer shopping',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#aaa',
      timer: 5000
    });

    if (result.isConfirmed) {
      this.router.navigate(['/cart']);
    }
  } catch (error) {
    console.error('Erreur:', error);
    await Swal.fire({
      title: 'Désolé',
      text: 'Nous n\'avons pas pu ajouter ce bassin à votre panier',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } finally {
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}

// Méthode pour ajouter un bassin personnalisé
async addCustomToCart(): Promise<void> {
  if (!this.bassin || !this.customizationSummary || this.isLoading) {
    return;
  }

  this.isLoading = true;

  try {
    const accessoiresPrice = this.customizationSummary.accessoires?.reduce(
      (sum: number, acc: any) => sum + (acc.prixAccessoire || 0), 
      0
    ) || 0;

    const prixEstime = this.bassin.prix 
      + (this.prixMateriaux[this.customizationSummary.materiau] || 0)
      + (this.prixDimensions[this.customizationSummary.dimension] || 0)
      + accessoiresPrice;

    const request: PanierItemRequest = {
      bassinId: this.bassin.idBassin,
      quantity: this.quantity,
      isCustomized: true,
      nomBassin: this.bassin.nomBassin,
      imageUrl: this.bassin.imagesBassin?.[0]?.imagePath || 'assets/default-image.webp',
      status: 'SUR_COMMANDE',
      materiauSelectionne: this.customizationSummary.materiau,
      dimensionSelectionnee: this.customizationSummary.dimension,
      couleurSelectionnee: this.customizationSummary.couleur,
      accessoireIds: this.customizationSummary.accessoires?.map((a: any) => a.idAccessoire) || [],
      prixOriginal: this.bassin.prix,
      prixMateriau: this.prixMateriaux[this.customizationSummary.materiau] || 0,
      prixDimension: this.prixDimensions[this.customizationSummary.dimension] || 0,
      prixAccessoires: accessoiresPrice,
      prixEstime: prixEstime,
      dureeFabrication: this.customizationSummary.dureeFabrication || 'À déterminer'
    };

    await lastValueFrom(this.cartService.addItemToCart(request).pipe(timeout(3000)));

    const result = await Swal.fire({
      title: 'Votre création est prête !',
      html: this.getCustomizationSuccessHtml(this.customizationSummary, accessoiresPrice, prixEstime),
      icon: 'success',
      showConfirmButton: true,
      confirmButtonText: 'Finaliser ma commande',
      showCancelButton: true,
      cancelButtonText: 'Ajouter un autre bassin',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#aaa',
      width: '800px'
    });

    if (result.isConfirmed) {
      this.router.navigate(['/panier']);
    }
  } catch (error) {
    console.error('Erreur:', error);
    await Swal.fire({
      title: 'Oups !',
      text: 'Une erreur est survenue lors de l\'enregistrement de votre bassin personnalisé',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } finally {
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}
// Méthode helper pour générer le HTML
private getCustomizationSuccessHtml(customization: any, accessoiresPrice: number, prixEstime: number): string {
    return `
        <div style="text-align: left;">
            <p>Votre bassin personnalisé a été ajouté au panier</p>
            <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                <p><strong>Récapitulatif :</strong></p>
                <p>- Matériau: ${customization.materiau}</p>
                <p>- Dimensions: ${customization.dimension}</p>
                <p>- Couleur: ${customization.couleur}</p>
                ${accessoiresPrice > 0 ? 
                    `<p>- Accessoires: ${customization.accessoires?.length} sélectionnés</p>` : ''}
                <p style="margin-top: 10px;"><strong>Prix total:</strong> ${prixEstime} TND</p>
            </div>
        </div>
    `;
}

  increaseQuantity(): void {
    this.quantity++;
    // Vous pouvez ajouter une limite si nécessaire
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  // Méthode pour calculer le prix d'un bassin personnalisé (unitaire)
  private calculateCustomBassinPrice(): number {
    if (!this.bassin || !this.customizationSummary) return 0;

    let basePrice = this.bassin.prix || 0;

    // Ajout du coût des accessoires
    if (this.customizationSummary.accessoires) {
      basePrice += this.customizationSummary.accessoires.reduce(
        (sum: number, acc: Accessoire) => sum + (acc.prixAccessoire || 0),
        0
      );
    }

    // Ajout des majorations éventuelles pour matériaux spéciaux
    if (this.customizationSummary.materiau) {
      const materiauPremium = ['verre', 'acier'].includes(
        this.customizationSummary.materiau.toLowerCase()
      );
      if (materiauPremium) {
        basePrice *= 1.2; // 20% de majoration pour les matériaux premium
      }
    }

    return basePrice;
  }
  // Méthode pour afficher l'alerte de succès
  private showSuccessAlert(message: string): void {
    Swal.fire({
      title: 'Succès',
      text: message,
      icon: 'success',
      showConfirmButton: true,
      confirmButtonText: 'Voir le panier',
      showCancelButton: true,
      cancelButtonText: 'Continuer',
      allowOutsideClick: false,
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/cart']);
      }
    });
  }

  changeImage(imageUrl: string): void {
    this.selectedImage = imageUrl;
    this.isZoomed = false;
  }

  toggleZoom(): void {
    this.isZoomed = !this.isZoomed;
  }

  getStepLabel(step: number): string {
    switch (step) {
      case 1:
        return 'Dimensions';
      case 2:
        return 'Matériaux';
      case 3:
        return 'Accessoires';
      case 4:
        return 'Couleur';
      default:
        return '';
    }
  }

  getColorDisplay(color: string): any {
    return { backgroundColor: color };
  }

  /********************************************* */
  // Méthodes à ajouter
  convertGithubUrl(url: string): string {
    if (!url) return ''; // Gère les cas où url est undefined ou null
    if (url.includes('github.com')) {
      return url
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    }
    return url;
  }
  get safeModelUrl(): string {
    return this.bassin?.image3DPath
      ? this.convertGithubUrl(this.bassin.image3DPath)
      : '';
  }

  viewIn3D(): void {
    if (!this.bassin?.image3DPath) return;

    this.isLoading = true;
    const modelUrl = this.convertGithubUrl(this.bassin.image3DPath);
    // Ici vous pourriez ouvrir une modal avec le model-viewer
    this.isLoading = false;
  }

  onModelError() {
    console.error('Erreur de chargement du modèle 3D');
    // Vous pouvez ici afficher une image de fallback ou un message d'erreur
  }

  viewInAR(): void {
    try {
      if (!this.bassin?.image3DPath) {
        throw new Error('No 3D model available');
      }

      this.isLoading = true;
      const modelUrl = this.convertGithubUrl(this.bassin.image3DPath);

      if (/Android/i.test(navigator.userAgent)) {
        const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
          modelUrl
        )}&mode=ar_only#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(
          window.location.href
        )};end;`;
        window.location.href = sceneViewerUrl;
      } else {
        setTimeout(() => this.generateQRCode(modelUrl), 0);
      }
    } catch (error) {
      console.error('AR View Error:', error);
      this.toastService.showError('Impossible de charger la vue AR');
    } finally {
      setTimeout(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }, 0);
    }
  }

  generateQRCode(modelUrl: string): void {
    console.log('Génération du QR Code pour:', modelUrl);
    const sceneViewerUrl = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
      modelUrl
    )}&mode=ar_only`;

    QRCode.toDataURL(
      sceneViewerUrl,
      {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 256,
      },
      (err, url) => {
        this.isLoading = false;
        if (err) {
          console.error('Error generating QR code:', err);
          Swal.fire('Erreur', 'Impossible de générer le QR Code.', 'error');
          return;
        }
        console.log('QR Code généré:', url);
        this.qrCodeImageUrl = url;
        this.cdr.detectChanges();
      }
    );
  }

  closeQRModal(): void {
    console.log('Fermeture de la modale');
    this.qrCodeImageUrl = null;
    this.isLoading = false;
  }

  // Méthodes de contrôle AR (identique au premier composant)
  zoomIn(): void {
    if (this.modelViewer) {
      const scaleAttribute = this.modelViewer.getAttribute('scale');
      const currentScale = scaleAttribute ? parseFloat(scaleAttribute) : 1;
      this.modelViewer.setAttribute('scale', (currentScale * 1.1).toString());
    }
    console.log('Zoom +');
  }

  zoomOut(): void {
    if (this.modelViewer) {
      const scaleAttribute = this.modelViewer.getAttribute('scale');
      const currentScale = scaleAttribute ? parseFloat(scaleAttribute) : 1;
      this.modelViewer.setAttribute('scale', (currentScale * 0.9).toString());
    }
    console.log('Zoom -');
  }

  moveUp(): void {
    if (this.modelViewer) {
      const orbitAttribute = this.modelViewer.getAttribute('camera-orbit');
      const currentPosition = orbitAttribute || '0deg 75deg 105%';
      const [angle, rest] = currentPosition.split(' ');
      const newPosition = `${angle} ${parseFloat(rest) + 10}deg 105%`;
      this.modelViewer.setAttribute('camera-orbit', newPosition);
    }
  }

  moveDown(): void {
    if (this.modelViewer) {
      const orbitAttribute = this.modelViewer.getAttribute('camera-orbit');
      const currentPosition = orbitAttribute || '0deg 75deg 105%';
      const [angle, rest] = currentPosition.split(' ');
      const newPosition = `${angle} ${parseFloat(rest) - 10}deg 105%`;
      this.modelViewer.setAttribute('camera-orbit', newPosition);
    }
  }

  moveLeft(): void {
    if (this.modelViewer) {
      const orbitAttribute = this.modelViewer.getAttribute('camera-orbit');
      const currentPosition = orbitAttribute || '0deg 75deg 105%';
      const [angle, rest] = currentPosition.split(' ');
      const newPosition = `${parseFloat(angle) - 10}deg ${rest}`;
      this.modelViewer.setAttribute('camera-orbit', newPosition);
    }
  }

  moveRight(): void {
    if (this.modelViewer) {
      const orbitAttribute = this.modelViewer.getAttribute('camera-orbit');
      const currentPosition = orbitAttribute || '0deg 75deg 105%';
      const [angle, rest] = currentPosition.split(' ');
      const newPosition = `${parseFloat(angle) + 10}deg ${rest}`;
      this.modelViewer.setAttribute('camera-orbit', newPosition);
    }
  }

  isClient(): boolean {
    return this.authState.isClient();
  }
  getRatingLabel(note: number): string {
    switch (note) {
      case 1:
        return 'Mauvais';
      case 2:
        return 'Moyen';
      case 3:
        return 'Bon';
      case 4:
        return 'Très bon';
      case 5:
        return 'Excellent';
      default:
        return '';
    }
  }

  /**Hana Ajouter */
  editCustomization(): void {
    this.isCustomizationComplete = false;
    this.customizationStep = 1;

    // Réinitialiser le formulaire avec les valeurs actuelles
    this.customizationForm.patchValue({
      materiau: this.customizationSummary.materiau,
      dimension: this.customizationSummary.dimension,
      couleur: this.customizationSummary.couleur,
      accessoires: [...this.customizationSummary.accessoires],
    });

    this.selectedColor = this.customizationSummary.couleur;
  }

  // Formate le prix pour l'affichage
  getDisplayPrice(bassin?: Bassin): string {
    if (!bassin) return '0,00 TND';

    if (bassin.promotionActive && bassin.prixPromo) {
      return `
      <span class="current-price">${bassin.prixPromo.toFixed(2)} TND</span>
      <span class="original-price">${bassin.prix.toFixed(2)} TND</span>
      <span class="discount-badge">-${bassin.promotion?.tauxReduction}%</span>
    `;
    }

    return `${bassin.prix.toFixed(2)} TND`;
  }

  private loadImages(bassin: Bassin): void {
    if (bassin.imagesBassin && bassin.imagesBassin.length > 0) {
      this.imagePreviews = bassin.imagesBassin.map(
        (img) =>
          `${this.bassinService.apiURL}/imagesBassin/getFS/${img.imagePath}`
      );
      this.selectedImage = this.imagePreviews[0];
    } else {
      this.selectedImage = 'assets/default-image.webp';
    }
  }

  addToFavorites(): void {
    if (this.bassin) {
      // Call your favorite service here
      this.toastService.showSuccess('Produit ajouté aux favoris!');
    }
  }

  // Update the method to make the parameter optional
  incrementQuantity(item?: PanierItem): void {
    if (item) {
      // This is for cart items
      if (item.isCustomized) {
        // Pas de limite de stock pour les articles personnalisés
        this.updateQuantity(item, item.quantity + 1);
        return;
      }

      if (!item.bassin) {
        this.updateQuantity(item, item.quantity + 1);
        return;
      }

      // Vérification du stock
      if (
        item.bassin.stock === undefined ||
        item.quantity < item.bassin.stock
      ) {
        this.updateQuantity(item, item.quantity + 1);
      } else {
        this.showStockAlert(item.bassin.stock);
      }
    } else {
      // This is for the product quantity selector
      this.quantity++;
    }
  }

  private showStockAlert(availableStock: number): void {
    Swal.fire({
      title: 'Stock limité',
      html: `Vous ne pouvez pas commander plus de <b>${availableStock}</b> unités de ce produit.`,
      icon: 'warning',
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6',
      timer: 3000,
      timerProgressBar: true,
      position: 'top-end',
      toast: true,
      showConfirmButton: false,
    });
  }

  updateQuantity(item: PanierItem, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.removeFromCart(item);
      return;
    }

    // Pour les articles non personnalisés, vérifier le stock
    if (
      !item.isCustomized &&
      item.bassin &&
      item.bassin.stock !== undefined &&
      newQuantity > item.bassin.stock
    ) {
      this.showStockAlert(item.bassin.stock);
      return;
    }

    this.cartService.updateQuantity(item, newQuantity).subscribe({
      next: () => {
        // Succès silencieux ou notification légère
        Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: 'Quantité mise à jour',
          showConfirmButton: false,
          timer: 1500,
          toast: true,
        });
      },
      error: (err) => {
        console.error('Erreur mise à jour quantité', err);
        Swal.fire({
          title: 'Erreur',
          text: 'Une erreur est survenue lors de la mise à jour de la quantité',
          icon: 'error',
          confirmButtonText: 'OK',
        });
      },
    });
  }
  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }
  removeFromCart(item: PanierItem): void {
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
            Swal.fire(
              'Supprimé!',
              "L'article a été retiré de votre panier.",
              'success'
            );
            // Rafraîchir le panier si nécessaire
            this.cartService.refreshCart();
          },
          error: (err) => {
            console.error('Erreur lors de la suppression', err);
            Swal.fire(
              'Erreur',
              'Une erreur est survenue lors de la suppression',
              'error'
            );
          },
        });
      }
    });
  }
  private loadBassinDetails(id: number): void {
    this.isLoading = true;

    this.bassinService
      .consulterBassin(id)
      .pipe(
        switchMap((bassin) => {
          if (!bassin) {
            return throwError(() => new Error('Bassin non trouvé'));
          }

          this.bassin = bassin;
          this.loadImages(bassin); // Charger les images dès que le bassin est disponible

          // Charger les options de personnalisation immédiatement
          this.loadCustomizationOptions(id);

          // Fetch promotions as a separate stream
          return this.bassinService.listeBassinsAvecPromotions().pipe(
            map((promotions) => {
              const bassinPromo = promotions.find(
                (p) => p.idBassin === bassin.idBassin
              );
              if (bassinPromo && bassinPromo.promotion) {
                this.bassin!.promotion = bassinPromo.promotion;
                // Don't call this directly - schedule it to run after current change detection cycle
                setTimeout(() => this.checkPromotionStatus(), 0);
              }
              return this.bassin;
            }),
            catchError((promoErr) => {
              console.warn(
                'Erreur lors du chargement des promotions',
                promoErr
              );
              return of(this.bassin);
            })
          );
        }),
        timeout(10000),
        catchError((err) => {
          console.error('Erreur lors du chargement du bassin', err);
          this.toastService.showError(
            'Impossible de charger les détails du bassin'
          );
          this.isLoading = false;
          return throwError(() => err);
        }),
        finalize(() => {
          this.isLoading = false;
          // Run change detection at the end of the observable chain
          setTimeout(() => this.cdr.detectChanges(), 0);
        })
      )
      .subscribe({
        next: (bassin) => {
          if (bassin) {
            // Handle async operations properly by scheduling them
            setTimeout(() => {
              this.loadCustomizationOptions(id);
              this.loadAvis(id);
              this.cdr.detectChanges();
            }, 0);
          }
        },
      });
  }

  private updatePromotionStatus(bassin: Bassin): void {
    if (!bassin || !bassin.promotion) {
      bassin.promotionActive = false;
      bassin.prixPromo = bassin.prix;
      return;
    }

    const now = new Date();
    const startDate = new Date(bassin.promotion.dateDebut);
    const endDate = new Date(bassin.promotion.dateFin);

    // Vérifie si la promotion est active
    bassin.promotionActive = now >= startDate && now <= endDate;

    if (bassin.promotionActive) {
      // Calcule le prix promo
      bassin.prixPromo =
        bassin.prix * (1 - bassin.promotion.tauxReduction / 100);
      this.startPromotionTimer(endDate);
    } else {
      bassin.prixPromo = bassin.prix;
    }

    console.log(`Promotion status updated: 
    Active: ${bassin.promotionActive}
    Original Price: ${bassin.prix}
    Promo Price: ${bassin.prixPromo}
    Reduction: ${bassin.promotion.tauxReduction}%`);
  }
  private startPromotionTimer(endDate: Date): void {
    // Nettoyer l'abonnement existant
    if (this.timeLeftSubscription) {
      this.timeLeftSubscription.unsubscribe();
    }

    this.timeLeftSubscription = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const now = new Date();
        const diff = endDate.getTime() - now.getTime();

        if (diff <= 0) {
          this.timeLeftForPromo = null;
          this.checkAndUpdatePromotion();
          return;
        }

        this.timeLeftForPromo = {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        };

        this.cdr.markForCheck();
      });
  }

  private checkAndUpdatePromotion(): void {
    if (!this.bassin || !this.bassin.promotion) {
      return;
    }

    const now = new Date();
    const startDate = new Date(this.bassin.promotion.dateDebut);
    const endDate = new Date(this.bassin.promotion.dateFin);

    // Vérifie si la promotion est active
    const isActive = now >= startDate && now <= endDate;

    // Si le statut a changé, met à jour et déclenche la détection de changement
    if (isActive !== this.bassin.promotionActive) {
      this.bassin.promotionActive = isActive;
      this.bassin.prixPromo = isActive
        ? this.bassin.prix * (1 - this.bassin.promotion.tauxReduction / 100)
        : this.bassin.prix;

      console.log(
        `Statut promotion mis à jour: ${isActive ? 'ACTIVE' : 'INACTIVE'}`
      );

      if (isActive) {
        this.startPromotionTimer(endDate);
      } else if (this.timeLeftSubscription) {
        this.timeLeftSubscription.unsubscribe();
        this.timeLeftForPromo = null;
      }

      this.cdr.detectChanges();
    }
  }

  getPrixAvecPromotion(bassin?: Bassin): number {
    if (!bassin || !this.hasActivePromotion(bassin)) return bassin?.prix || 0;

    // Vérifiez que le taux de réduction est bien entre 0 et 1 (pour 0% à 100%)
    const tauxReduction = bassin.promotion?.tauxReduction || 0;
    const reduction = Math.min(1, Math.max(0, tauxReduction)); // S'assure que c'est entre 0 et 1

    return bassin.prix * (1 - reduction);
  }

  hasActivePromotion(bassin?: Bassin): boolean {
    if (
      !bassin ||
      !bassin.promotion ||
      bassin.promotion.tauxReduction === undefined
    ) {
      return false;
    }

    // Vérifier les dates de promotion
    const now = new Date();
    const startDate = new Date(bassin.promotion.dateDebut);
    const endDate = new Date(bassin.promotion.dateFin);

    return now >= startDate && now <= endDate;
  }

  getPrixOriginal(bassin?: Bassin): number {
    return bassin?.prix || 0;
  }

  calculatePromotionProgress(): number {
    if (!this.bassin?.promotion?.dateDebut || !this.bassin?.promotion?.dateFin)
      return 0;

    try {
      const now = new Date();
      const startDate = new Date(this.bassin.promotion.dateDebut);
      const endDate = new Date(this.bassin.promotion.dateFin);

      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();

      return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    } catch (e) {
      console.error('Error calculating promotion progress', e);
      return 0;
    }
  }

  getTauxReductionFormatted(bassin?: Bassin): string {
    if (!this.hasActivePromotion(bassin)) return '0';
    // TypeScript sait maintenant que ces valeurs existent
    return (bassin!.promotion!.tauxReduction * 100).toFixed(0);
  }

  // In your calculateTimeLeft method:
  calculateTimeLeft(endDate: Date): void {
    this.ngZone.runOutsideAngular(() => {
      // Store the timer reference for cleanup
      this.timer = setInterval(() => {
        this.ngZone.run(() => {
          const now = new Date();
          const diff = endDate.getTime() - now.getTime();

          if (diff <= 0) {
            clearInterval(this.timer);
            if (this.bassin) {
              this.bassin.promotionActive = false;
              this.bassin.prixPromo = this.bassin.prix;
            }
            this.timeLeftForPromo = null;
            this.cdr.detectChanges(); // Explicitly trigger change detection
            return;
          }

          this.timeLeftForPromo = {
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor(
              (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            ),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
          };

          this.cdr.detectChanges(); // Explicitly trigger change detection
        });
      }, 1000);
    });
  }

  private calculateWidth(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        const newWidth = this.calculateNewWidth();
        if (Math.abs(newWidth - this.widthValue) > 0.01) {
          this.ngZone.run(() => {
            this.widthValue = newWidth;
            this.stableWidth = `${newWidth}%`;
            this.cdr.markForCheck();
          });
        }
      });
    });
  }

  ngAfterContentChecked(): void {
    this.calculateWidth();
  }

  private prepareCustomizationData() {
    if (!this.customizationSummary) return {};

    return {
      // Conserver la structure actuelle
      bassinBase: this.bassin,

      // Ajouter explicitement tous les détails
      dimension: this.customizationSummary.dimension,
      dimensionSelectionnee: this.customizationSummary.dimension,
      dimensionPrice:
        this.prixDimensions[this.customizationSummary.dimension] || 0,

      materiau: this.customizationSummary.materiau,
      materiauSelectionne: this.customizationSummary.materiau,
      materiauPrice:
        this.prixMateriaux[this.customizationSummary.materiau] || 0,

      couleur: this.customizationSummary.couleur,
      couleurSelectionnee: this.customizationSummary.couleur,

      accessoires: this.customizationSummary.accessoires || [],
      accessoiresPrice: this.calculateAccessoiresTotal(),

      // Durée de fabrication en format uniforme
      dureeFabrication: this.customizationSummary.dureeFabrication,

      // Prix total estimé
      prixEstime: this.customizationSummary.prixEstime,

      // URL de l'image si disponible
      imageUrl: this.getCustomImageUrl(),
    };
  }

  /**
   * Calcule le prix total des accessoires sélectionnés
   * @returns Le prix total des accessoires (0 si aucun accessoire)
   */
  private calculateAccessoiresTotal(): number {
    if (!this.customizationSummary?.accessoires?.length) {
      return 0;
    }

    return this.customizationSummary.accessoires.reduce(
      (total: number, acc: Accessoire) => total + (acc.prixAccessoire || 0),
      0
    );
  }

  // Méthode pour obtenir l'URL de l'image personnalisée
  private getCustomImageUrl(): string {
    // Priorité 1: Image liée au matériau sélectionné
    const material = this.customizationSummary?.materiau;
    if (material && this.materiauxImages?.[material]) {
      return this.materiauxImages[material];
    }

    // Priorité 2: Image du bassin de base
    if (this.bassin?.imagesBassin?.[0]?.imagePath) {
      return `${
        this.bassinService.apiURL
      }/imagesBassin/getFS/${encodeURIComponent(
        this.bassin.imagesBassin[0].imagePath
      )}`;
    }

    // Fallback
    return 'assets/default-image.webp';
  }

  // Formatage de la durée de fabrication
  getFabricationTime(): string {
    if (this.customizationSummary?.dureeFabrication) {
      return `${this.customizationSummary.dureeFabrication} jours`;
    }
    
    if (this.bassin?.dureeFabricationDisplay) {
      return this.bassin.dureeFabricationDisplay;
    }
    
    return '3-15 jours';
  }
}
