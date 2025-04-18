import { ChangeDetectorRef, Component , OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
/*import { Bassin } from '../../../core/models/bassin.models';
import { ActivatedRoute, Router } from '@angular/router';
import { BassinService } from '../../../core/services/bassin.service';
import { CartService } from '../../../core/services/cart.service';*/
import { trigger, transition, style, animate } from '@angular/animations';
import { Bassin } from '../../../../core/models/bassin.models';
import { ActivatedRoute, Router } from '@angular/router';
import { BassinService } from '../../../../core/services/bassin.service';
import { CartService } from '../../../../core/services/cart.service';
import * as QRCode from 'qrcode';
import { ModelViewerElement } from '@google/model-viewer';
import Swal from 'sweetalert2';
import { ArService } from '../../../../core/services/ar.service';

@Component({
  selector: 'app-bassin-personnalise-client',
  templateUrl: './bassin-personnalise-client.component.html',
  styleUrl: './bassin-personnalise-client.component.css',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))
      ])
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('0.5s ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('0.4s ease-in', style({ transform: 'translateX(-100%)' }))
      ])
    ])
  ]
})

export class BassinPersonnaliseClientComponent implements OnInit {
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

  // Options configurées par l'admin
  listeMateriaux: string[] = [];
  listeDimensions: string[] = [];
  listeAccessoires: any[] = [];

  // Mapping des images pour les matériaux
  materiauxImages: { [key: string]: string } = {
    "Béton fibré haute performance": "assets/img/materiaux/beton.jpg",
    "Polyéthylène haute densité (PEHD)": "assets/img/materiaux/pehd.jpg",
    "Composite verre-résine": "assets/img/materiaux/composite.jpg",
    "Acier inoxydable 316L (marine)": "assets/img/materiaux/acier.jpg",
    "Tôle d'acier galvanisé à chaud": "assets/img/materiaux/tole.jpg",
    "PVC renforcé": "assets/img/materiaux/PVC.jpg",
    "Membrane EPDM épaisseur 1.5mm": "assets/img/materiaux/Membrane.jpg",
    "Géomembrane HDPE": "assets/img/materiaux/Géomembrane.jpg",
    "Pierre reconstituée": "assets/img/materiaux/pierre.jpg",
    "Fibre de carbone": "assets/img/materiaux/fibre.jpg",
    "Bâche armée PVC 900g/m²": "assets/img/materiaux/bache.jpg",
    "Polypropylène expansé": "assets/img/materiaux/Polypropylène.jpg",
    "Béton polymère": "assets/img/materiaux/Béton.jpg",
    "Aluminium anodisé": "assets/img/materiaux/Aluminium.jpg",
    "Titane grade 2": "assets/img/materiaux/titane.jpg",
    "Bois composite": "assets/img/materiaux/bois.jpg",
    "Résine époxy renforcée": "assets/img/materiaux/resine.jpg",
  };

  // Prix des matériaux
  prixMateriaux: { [key: string]: number } = {
    "Béton fibré haute performance": 50,
    "Polyéthylène haute densité (PEHD)": 60,
    "Composite verre-résine": 70,
    "Acier inoxydable 316L (marine)": 80,
    "Tôle d'acier galvanisé à chaud": 90,
    "PVC renforcé": 100,
    "Membrane EPDM épaisseur 1.5mm": 110,
    "Géomembrane HDPE": 120,
    "Pierre reconstituée": 130,
    "Fibre de carbone": 140,
    "Bâche armée PVC 900g/m²": 150,
    "Polypropylène expansé": 160,
    "Béton polymère": 170,
    "Aluminium anodisé": 180,
    "Titane grade 2": 190,
    "Bois composite": 200,
    "Résine époxy renforcée": 210,
  };

  prixDimensions: { [key: string]: number } = {
    "150x100x80 cm (≈ 1 200L)": 100, 
    "180x120x90 cm (≈ 1 944L)": 150,
    "200x150x100 cm (≈ 3 000L)": 200,
    "250x180x120 cm (≈ 5 400L)": 300,
    "300x200x150 cm (≈ 9 000L)": 400,
    "350x250x150 cm (≈ 13 125L)": 500,
    "400x300x200 cm (≈ 24 000L)": 600,
    "500x350x200 cm (≈ 35 000L)": 700,
    "600x400x250 cm (≈ 60 000L)": 800,
    "700x500x300 cm (≈ 105 000L)": 900,
    "800x600x350 cm (≈ 168 000L)": 1000,
    "1000x700x400 cm (≈ 280 000L)": 1200, 
  };
  
// Palette de couleurs regroupées par catégorie
colorPalette = {
  blues: ['#1976D2', '#1E88E5', '#2196F3', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#E3F2FD'],
  greens: ['#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#E8F5E9'],
  reds: ['#C62828', '#D32F2F', '#E53935', '#F44336', '#EF5350', '#E57373', '#EF9A9A', '#FFEBEE'],
  grays: ['#212121', '#424242', '#616161', '#757575', '#9E9E9E', '#BDBDBD', '#E0E0E0', '#EEEEEE'],
  browns: ['#5D4037', '#6D4C41', '#795548', '#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8', '#EFEBE9'],
  purples: ['#7B1FA2', '#8E24AA', '#9C27B0', '#AB47BC', '#BA68C8', '#CE93D8', '#E1BEE7', '#F3E5F5'],
  yellows: ['#F57F17', '#F9A825', '#FBC02D', '#FFEB3B', '#FFEE58', '#FFF59D', '#FFF9C4', '#FFFDE7'],
  cyans: ['#006064', '#00838F', '#0097A7', '#00BCD4', '#26C6DA', '#4DD0E1', '#80DEEA', '#E0F7FA']
};

// Couleur actuellement sélectionnée
selectedColor: string = '';

//les varaibles ar
qrCodeImageUrl: string | null = null;
isLoading: boolean = false;
isARActive: boolean = false;
@ViewChild('modelViewer') modelViewer!: ModelViewerElement;

  
  constructor(
    private route: ActivatedRoute,
    private bassinService: BassinService,
    private cartService: CartService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private arService : ArService
  ) {
    this.customizationForm = this.fb.group({
      materiau: ['', Validators.required],
      dimension: ['', Validators.required],
      accessoires: this.fb.array([]),
      couleur: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.bassinService.consulterBassin(+id).subscribe({
        next: (bassin) => {
          this.bassin = bassin;
          if (bassin.imagesBassin && bassin.imagesBassin.length > 0) {
            this.imagePreviews = bassin.imagesBassin.map(
              (img) => `http://localhost:8089/aquatresor/api/imagesBassin/getFS/${img.imagePath}`
            );
            this.selectedImage = this.imagePreviews[0];
          } else {
            this.selectedImage = 'assets/default-image.webp';
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement du bassin', err);
        },
      });
      // Initialiser la couleur sélectionnée avec la première couleur bleue par défaut
  this.selectedColor = this.colorPalette.blues[0];
      // Récupérer les options configurées par l'admin
      this.bassinService.getBassinPersonnaliseOptions(+id).subscribe({
        next: (options) => {
          this.listeMateriaux = options.materiaux;
          this.listeDimensions = options.dimensions;
          this.listeAccessoires = options.accessoires;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des options', err);
        }
      });
    }
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
  const index = accessoires.findIndex((a: any) => a.idAccessoire === accessoire.idAccessoire);
  
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
  return accessoires.some((a: any) => a.idAccessoire === accessoire.idAccessoire);
} 

  handleImageError(event: any, accessoire: any) {
    console.error('Erreur de chargement de l\'image:', accessoire.imageUrl);
    event.target.src = 'assets/default-accessoire.jpg'; // Image par défaut en cas d'erreur
  }

  startCustomization(): void {
    this.isCustomizing = true;
    this.customizationStep = 1;
    this.customizationForm.patchValue({
      materiau: this.listeMateriaux[0],
      dimension: this.listeDimensions[0],
      couleur: this.colorPalette
    });
  }

  cancelCustomization(): void {
    this.isCustomizing = false;
    this.customizationStep = 1;
    this.isCustomizationComplete = false;
    this.customizationForm.reset();
  }

  nextStep(): void {
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
    return this.customizationForm.valid;
  }

  completeCustomization(): void {
    this.isCustomizationComplete = true;
    this.customizationSummary = {
      materiau: this.customizationForm.get('materiau')?.value,
      dimension: this.customizationForm.get('dimension')?.value,
      couleur: this.customizationForm.get('couleur')?.value,
      accessoires: this.customizationForm.get('accessoires')?.value,
      prixEstime: this.calculateCustomPrice()
    };
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

    // Ajouter le coût du matériau
    const materiau = this.customizationForm.get('materiau')?.value;
    const prixMateriau = this.prixMateriaux[materiau] || 0;

    // Ajouter le coût de la dimension
    const dimension = this.customizationForm.get('dimension')?.value;
    const prixDimension = this.prixDimensions[dimension] || 0;

    // Ajouter le coût des accessoires
    const accessoiresPrix = this.customizationForm.get('accessoires')?.value.reduce((total: number, acc: any) => {
      return total + (acc.prixAccessoire || 0);
    }, 0);

    // Calculer le prix total
    return basePrice + prixMateriau + prixDimension + accessoiresPrix;
  }

  onSubmit(): void {
    if (this.customizationForm.valid && this.bassin) {
      const customProps = {
        materiau: this.customizationForm.value.materiau,
        dimension: this.customizationForm.value.dimension,
        accessoires: this.customizationForm.value.accessoires,
        couleur: this.customizationForm.value.couleur,
        prix: this.calculateCustomPrice()
      };

      const customizedBassin = Object.assign(
        Object.create(Object.getPrototypeOf(this.bassin)),
        this.bassin,
        customProps
      );

    //  this.cartService.addToCart(customizedBassin);
      this.router.navigate(['/cart']);
    }
  }
/*
  addToCart(): void {
    if (this.bassin) {
      this.cartService.addToCart(this.bassin);
      // Afficher un message de confirmation
      this.showToast('Produit ajouté au panier avec succès!');
    }
  }
  */
  showToast(message: string): void {
    // Cette méthode pourrait être implémentée avec un service Toast
    console.log('Toast message:', message);
    // Exemple: this.toastService.show(message, 'success');
  }

  addToFavorites(): void {
    if (this.bassin) {
      console.log('Ajout aux favoris :', this.bassin);
      this.showToast('Produit ajouté aux favoris!');
    }
  }

  changeImage(imageUrl: string): void {
    this.selectedImage = imageUrl;
    this.isZoomed = false;
  }

  toggleZoom(): void {
    this.isZoomed = !this.isZoomed;
  }

  /*viewIn3D(): void {
    console.log('Voir en 3D');
    // Implémenter la logique pour afficher en 3D
  }

  viewInAR(): void {
    console.log('Voir en AR');
    // Implémenter la logique pour afficher en AR
  }*/
  
  getStepLabel(step: number): string {
    switch(step) {
      case 1: return 'Dimensions';
      case 2: return 'Matériaux';
      case 3: return 'Accessoires';
      case 4: return 'Couleur';
      default: return '';
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
    return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  return url;
}
get safeModelUrl(): string {
  return this.bassin?.image3DPath ? this.convertGithubUrl(this.bassin.image3DPath) : '';
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
  if (!this.bassin?.image3DPath) return;

  console.log('User Agent:', navigator.userAgent);
  console.log('image3DPath:', this.bassin.image3DPath);

  this.isLoading = true;
  const modelUrl = this.convertGithubUrl(this.bassin.image3DPath);
  
  if (/Android/i.test(navigator.userAgent)) {
    const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_only#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end;`;
    window.location.href = sceneViewerUrl;

    this.isARActive = true;
    this.cdr.detectChanges();
  } else {
    this.generateQRCode(modelUrl);
  }
}

generateQRCode(modelUrl: string): void {
  console.log('Génération du QR Code pour:', modelUrl);
  const sceneViewerUrl = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_only`;
  
  QRCode.toDataURL(sceneViewerUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 256,
  }, (err, url) => {
    this.isLoading = false;
    if (err) {
      console.error('Error generating QR code:', err);
      Swal.fire('Erreur', 'Impossible de générer le QR Code.', 'error');
      return;
    }
    console.log('QR Code généré:', url);
    this.qrCodeImageUrl = url;
    this.cdr.detectChanges();
  });
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
}