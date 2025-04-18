import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Bassin } from '../../../../core/models/bassin.models';
import { BassinService } from '../../../../core/services/bassin.service';
import { AuthService } from '../../../../core/authentication/auth.service';
import Swal from 'sweetalert2';
import * as QRCode from 'qrcode';
import { ModelViewerElement } from '@google/model-viewer';
import { ArService } from '../../../../core/services/ar.service';
import { BassinStateService } from '../../../../core/services/bassin-state.service';

@Component({
  selector: 'app-bassin-personnalise-ardetail',
  templateUrl: './bassin-personnalise-ardetail.component.html',
  styleUrl: './bassin-personnalise-ardetail.component.css'
})
export class BassinPersonnaliseArdetailComponent implements OnInit {
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
    private arService : ArService,
    private bassinStateService: BassinStateService
  ) {
    // Gérer l'état de navigation
  const navigation = this.router.getCurrentNavigation();
  if (navigation?.extras.state?.['isPerso']) {
    this.isBassinPersonnalise = true;
    this.bassinStateService.setBassinPersonnalise(true);
  }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.getBassinDetails();
      this.checkBassinPersonnalise(+id); // Vérifier si le bassin est personnalisé    
    }

    // Abonnement AU-DESSUS du checkBassinPersonnalise
    this.bassinStateSubscription = this.bassinStateService.bassinPersonnalise$.subscribe(isPerso => {
      console.log('Nouvel état de personnalisation:', isPerso);
      this.isBassinPersonnalise = isPerso;
      this.cdr.detectChanges();
    });

    console.log('Component Loaded');
  console.log('Initial AR Active:', this.isARActive);
  }

  // Ajoutez ceci pour gérer la désinscription
private bassinStateSubscription: any;

ngOnDestroy(): void {
  if (this.bassinStateSubscription) {
    this.bassinStateSubscription.unsubscribe();
  }
}

  // Méthode pour vérifier si le bassin est personnalisé
  checkBassinPersonnalise(idBassin: number): void {
    this.bassinService.getBassinPersonnaliseByBassinId(idBassin).subscribe({
      next: (response) => {
        const isPerso = response !== null && response !== undefined;
        console.log('Réponse du serveur:', response, 'isPerso:', isPerso);
        this.isBassinPersonnalise = isPerso;
        this.bassinStateService.setBassinPersonnalise(isPerso);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur lors de la vérification', err);
        this.isBassinPersonnalise = false;
        this.bassinStateService.setBassinPersonnalise(false);
        this.cdr.detectChanges();
      }
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
    console.log('User Agent:', navigator.userAgent); // Ajoutez ce log
    console.log('image3DPath:', bassin.image3DPath); // Ajoutez ce log

    this.isLoading = true;
    const modelUrl = this.convertGithubUrl(bassin.image3DPath);
    
    if (/Android/i.test(navigator.userAgent)) {
      const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_only#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end;`;
      window.location.href = sceneViewerUrl;

      this.isARActive = true; // Activer AR
        console.log('isARActive:', this.isARActive);
        this.cdr.detectChanges(); // Force l'update de l'UI

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
  // Méthode pour zoomer
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
}