import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Bassin } from '../../../../core/models/bassin.models';
import { BassinService } from '../../../../core/services/bassin.service';
import { AuthService } from '../../../../core/authentication/auth.service';
import Swal from 'sweetalert2';
import * as QRCode from 'qrcode';
import { ModelViewerElement } from '@google/model-viewer';
import { ArService } from '../../../../core/services/ar.service';

@Component({
  selector: 'app-details-bassin',
  templateUrl: './details-bassin.component.html',
  styleUrls: ['./details-bassin.component.css']
})
export class DetailsBassinComponent implements OnInit {
  //@ViewChild('modelViewer') modelViewer!: ModelViewerElement; // Référence à l'élément <model-viewer>
  bassin?: Bassin;
  loading = true;
  error = false;
  isSidebarVisible: boolean = true;
  imagePreviews: string[] = [];
  qrCodeImageUrl: string | null = null; // Déclaration unique de qrCodeImageUrl
  isLoading: boolean = false; // Déclaration unique de isLoading
  isBassinPersonnalise: boolean = false; //pour vérifier si le bassin est personnalisé

  constructor(
    private route: ActivatedRoute,
    private bassinService: BassinService,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private arService : ArService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.getBassinDetails();
      this.checkBassinPersonnalise(+id); // Vérifier si le bassin est personnalisé
    }
    console.log('Component Loaded');
  console.log('Initial AR Active:', this.isARActive);
  }

  // Méthode pour vérifier si le bassin est personnalisé
  checkBassinPersonnalise(idBassin: number): void {
    this.bassinService.getBassinPersonnaliseByBassinId(idBassin).subscribe({
      next: (response) => {
        console.log('Réponse du service:', response); // Log pour vérifier la réponse
        this.isBassinPersonnalise = !!response && Object.keys(response).length > 0; // Vérifier si l'objet n'est pas vide
        this.cdr.detectChanges(); // Forcer la détection des changements
      },
      error: (err) => {
        console.error('Erreur lors de la vérification de la personnalisation du bassin', err);
        this.isBassinPersonnalise = false; // Par défaut, considérer que le bassin n'est pas personnalisé
      },
    });
  }

  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
    document.body.classList.toggle('g-sidenav-hidden', !this.isSidebarVisible);
  }

  getBassinDetails(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.bassinService.consulterBassin(id).subscribe({
      next: (bassin: Bassin) => {
        this.bassin = bassin;
        console.log("Bassin chargé :", this.bassin);
        this.loading = false;
        this.cdr.detectChanges(); // Force la détection des changements

        if (this.bassin.imagesBassin && this.bassin.imagesBassin.length > 0) {
          this.imagePreviews = this.bassin.imagesBassin.map(image => `http://localhost:8089/aquatresor/api/imagesBassin/getFS/${image.imagePath}`);
        } else {
          this.bassin.imageStr = 'assets/default-image.png';
        }
      },
      error: (err: Error) => {
        console.error('Erreur lors de la récupération des détails du bassin', err);
        this.error = true;
        this.loading = false;
        this.cdr.detectChanges(); // Force la détection des changements
      }
    });
  }

  supprimerBassin(id: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Vous ne pourrez pas revenir en arrière !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer !'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bassinService.supprimerBassin(id).subscribe({
          next: () => {
            Swal.fire('Supprimé !', 'Le bassin a été supprimé.', 'success');
            this.router.navigate(['/admin/bassin']);
          },
          error: (err: Error) => {
            Swal.fire('Erreur !', 'Une erreur est survenue lors de la suppression.', 'error');
            console.error('Erreur lors de la suppression du bassin', err);
          }
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/bassin']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }

  /********Code 3D image */

  convertGithubUrl(url: string): string {
    if (url.includes('github.com')) {
      return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
  }

  onModelLoad(): void {
    this.isLoading = false; // Masquer le loader après le chargement
  }
  
  onModelError(): void {
    this.isLoading = false; // Masquer le loader en cas d'erreur
    console.error('Erreur lors du chargement du modèle 3D');
  }
  
  showARViewer(bassin: any): void {
    console.log('User Agent:', navigator.userAgent);
    console.log('image3DPath:', bassin.image3DPath);

    if (!bassin?.image3DPath) {
        console.error('Aucun modèle 3D disponible');
        return;
    }

    this.isLoading = true;
    const modelUrl = this.convertGithubUrl(bassin.image3DPath);

    // Détection de plateforme améliorée
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) || 
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMacOS = /Macintosh/i.test(navigator.userAgent) && !isIOS;

    if (isAndroid) {
        // Solution pour Android
        this.launchAndroidAR(modelUrl);
    } else if (isIOS) {
        // Solution pour iOS
        this.launchIOSAR(modelUrl);
    } else if (isMacOS) {
        // Solution pour macOS
        this.launchMacOSAR(modelUrl);
    } else {
        // Solution par défaut (QR Code)
        this.generateQRCode(modelUrl);
    }
}

private launchAndroidAR(modelUrl: string): void {
    const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_only#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end;`;
    window.location.href = sceneViewerUrl;
    
    // Fallback après 500ms si l'application n'est pas installée
    setTimeout(() => {
        if (!document.hidden) {
            window.location.href = `https://arvr.google.com/scene-viewer?file=${encodeURIComponent(modelUrl)}`;
        }
    }, 500);
}

private launchIOSAR(modelUrl: string): void {
    // Convertir en USDZ pour iOS
    const usdzUrl = modelUrl.replace(/\.(glb|gltf)$/i, '.usdz');
    
    // Essayer plusieurs méthodes d'ouverture
    const quickLookUrl = `https://usdzviewer.app/launch?url=${encodeURIComponent(usdzUrl)}`;
    
    // Méthode 1: Ouverture directe
    const opened = window.open(quickLookUrl, '_blank');
    
    // Fallback après 300ms
    setTimeout(() => {
        if (!opened || opened.closed || typeof opened.closed === 'undefined') {
            // Méthode 2: Redirection vers USDZ Viewer
            window.location.href = `https://usdzviewer.app/launch?url=${encodeURIComponent(usdzUrl)}`;
        }
    }, 300);
}

private launchMacOSAR(modelUrl: string): void {
    // Pour macOS, nous pouvons utiliser WebXR ou proposer le téléchargement
    if ('xr' in navigator) {
        // Vérifier la compatibilité WebXR
        navigator.xr?.isSessionSupported('immersive-ar').then((supported) => {
            if (supported) {
                this.startWebXR(modelUrl);
            } else {
                this.generateQRCode(modelUrl);
            }
        });
    } else {
        this.generateQRCode(modelUrl);
    }
}

private startWebXR(modelUrl: string): void {
    console.log('Starting WebXR AR session');
    this.isARActive = true;
    this.cdr.detectChanges();
    
    // Ici vous devriez implémenter la logique WebXR
    // C'est un exemple basique
    const modelViewer = this.modelViewer;
    if (modelViewer) {
        modelViewer.activateAR();
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
      this.cdr.detectChanges(); // Force la détection des changements
    });
  }

  closeQRModal(): void {
    console.log('Fermeture de la modale');
    this.qrCodeImageUrl = null; // Utilisation de la propriété existante
    this.isLoading = false; // Utilisation de la propriété existante
  }

  // Méthode pour faire pivoter l'objet
  rotateModel(degrees: number): void {
    if (this.modelViewer) {
      const currentRotation = this.modelViewer.getAttribute('camera-orbit');
      if (currentRotation) {
        const [angle, rest] = currentRotation.split(' ');
        const newRotation = `${parseFloat(angle) + degrees}deg ${rest}`;
        this.modelViewer.setAttribute('camera-orbit', newRotation);
      }
    }
  }

  // Méthode pour réinitialiser la position de l'objet
  resetModel(): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('camera-orbit', '0deg 75deg 105%');
    }
  }
  
 /* startAR(): void {
    console.log('Starting AR...');
    if (this.arService) {
      this.arService.startAR();
    } else {
      console.error('ArService is not initialized!');
    }
  }
  
  stopAR(): void {
    console.log('Stopping AR...');
    if (this.arService) {
      this.arService.stopAR();
    } else {
      console.error('ArService is not initialized!');
    }
  }*/

  isARActive: boolean = false; // Contrôle l'affichage des boutons AR
  @ViewChild('modelViewer') modelViewer!: ModelViewerElement;

// Méthode pour zoomer
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

  // Activer les contrôles AR
  // Activer les contrôles AR
startAR(): void {
  console.log('Before activation:', this.isARActive);
  this.isARActive = true;
  console.log('After activation:', this.isARActive);
  this.cdr.detectChanges(); 

  if (this.arService) {
    this.arService.startAR();
  } else {
    console.error('ArService is not initialized!');
  }
}

// Désactiver les contrôles AR
stopAR(): void {
  this.isARActive = false; // Masquer les boutons de contrôle AR
  if (this.arService) {
    this.arService.stopAR();
    this.cdr.detectChanges();

  } else {
    console.error('ArService is not initialized!');
  }
}

currentImageIndex = 0;
selectedImage: string | null = null;

nextImage() {
    if (this.imagePreviews && this.imagePreviews.length > 0) {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.imagePreviews.length;
    }
}

prevImage() {
    if (this.imagePreviews && this.imagePreviews.length > 0) {
        this.currentImageIndex = (this.currentImageIndex - 1 + this.imagePreviews.length) % this.imagePreviews.length;
    }
}

openImageModal(imageUrl: string) {
    this.selectedImage = imageUrl;
}

closeImageModal() {
    this.selectedImage = null;
}
}