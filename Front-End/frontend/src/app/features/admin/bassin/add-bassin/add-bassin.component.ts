import { AuthService } from './../../../../core/authentication/auth.service';
import { Component, OnInit } from '@angular/core';
import { Bassin } from '../../../../core/models/bassin.models';
import { Categorie } from '../../../../core/models/categorie.models';
import { BassinService } from '../../../../core/services/bassin.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { BassinBase } from '../../../../core/models/bassin-base.model';


@Component({
  selector: 'app-add-bassin',
  templateUrl: './add-bassin.component.html',
  styleUrls: ['./add-bassin.component.css'],
})
export class AddBassinComponent implements OnInit {

  newBassin: Bassin = new Bassin();

  categories: Categorie[] = [];
  newIdCategorie!: number;
  message: string = '';
  uploadedImage!: File;
  imagePath: any;
  dimensionsOptions: { label: string; value: string }[] = [
    { label: '2m x 1.5m x 1m (≈ 3 000L)', value: '200x150x100 cm' },
    { label: '2.5m x 1.5m x 1m (≈ 3 750L)', value: '250x150x100 cm' },
    { label: '3m x 2m x 1m (≈ 6 000L)', value: '300x200x100 cm' },
    { label: '3m x 2m x 1.5m (≈ 9 000L)', value: '300x200x150 cm' },
    { label: '3.5m x 2.5m x 1.5m (≈ 13 125L)', value: '350x250x150 cm' },
    { label: '4m x 2.5m x 1.5m (≈ 15 000L)', value: '400x250x150 cm' },
    { label: '4m x 2.5m x 2m (≈ 20 000L)', value: '400x250x200 cm' },
    { label: '5m x 3m x 2m (≈ 30 000L)', value: '500x300x200 cm' },
    { label: '6m x 3.5m x 2.5m (≈ 52 500L)', value: '600x350x250 cm' },
    { label: '7m x 4m x 2.5m (≈ 70 000L)', value: '700x400x250 cm' },
    { label: '8m x 5m x 3m (≈ 120 000L)', value: '800x500x300 cm' },
  ];
  couleurs: string[] = ['Bleu clair', 'Bleu foncé', 'Blanc', 'Gris clair', 'Gris foncé',
    'Beige', 'Sable', 'Vert', 'Rouge', 'Noir', 'Marron'];

    //uploadedImages: File[] = [];
    //imagePaths: string[] = [];
    uploadedImages: { [key: string]: File[] } = {
      bassin: [],
      detail: [],
      emplacement: [],
      imgmateriaux: []
    };
    
    imagePaths: { [key: string]: string[] } = {
      bassin: [],
      detail: [],
      emplacement: [],
      imgmateriaux: []
    };

    

  // Ajoutez cette propriété pour stocker les compteurs d'images
  imageCounters: { [key: string]: number } = {};

  selectedFiles: File[] = []; // Stocke les fichiers sélectionnés

  isValidGithubUrl: boolean = true; // Par défaut, l'URL est valide


  constructor(private bassinService: BassinService,
    private router: Router,
    private authService: AuthService) { }

  ngOnInit(): void {
    this.loadCategories();
  }

  onCategoryChange(event: any): void {
    this.newIdCategorie = +event.target.value;

  }

  loadCategories(): void {
    this.bassinService.listeCategories().subscribe(
      (data) => {
        console.log('Catégories chargées:', data);
        this.categories = data;
      },
      (error) => {
        console.error('Erreur lors du chargement des catégories', error);
        this.message = 'Erreur lors du chargement des catégories';
      }
    );
  }

  
  updateDisponibilite(): void {
    this.newBassin.disponible = this.newBassin.stock !== undefined && this.newBassin.stock > 0;
  }

  onStockChange(): void {
    this.updateDisponibilite();
  }

 

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }

  goBack(): void {
    this.router.navigate(['/admin/bassin']);
  }

  
/////////////////////////////////A decommenté//////////////////////////

 /* onImageUpload(event: any, category: string) {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
  
      // Assurez-vous qu'une seule image est stockée par catégorie
      this.uploadedImages[category] = [file];
  
      // Génération d'un aperçu de l'image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePaths[category] = [e.target.result];
      };
      reader.readAsDataURL(file);
    }
  }
  
      
  removeImage(category: string) {
    this.imagePaths[category] = []; // Supprimer l’image
    this.uploadedImages[category] = []; // Supprimer le fichier
  }

      
  addBassin() {
    if (!this.newIdCategorie) {
      Swal.fire('Erreur', 'Veuillez sélectionner une catégorie.', 'error');
      return;
    }
  
    // Associer la catégorie au bassin
    this.newBassin.categorie = this.categories.find(c => c.idCategorie === this.newIdCategorie)!;
  
    // Ajouter le bassin
    this.bassinService.ajouterBassin(this.newBassin).subscribe(
      (bassin) => {
        this.newBassin.idBassin = bassin.idBassin;
  
        // Définir un index fixe pour chaque catégorie
        type CategoryKey = 'bassin' | 'detail' | 'emplacement' | 'imgmateriaux';
        const categoryIndexMap: Record<CategoryKey, number> = {
          bassin: 1,      // Index 1 pour bassin
          detail: 2,      // Index 2 pour detail
          emplacement: 3, // Index 3 pour emplacement
          imgmateriaux: 4 // Index 4 pour imgmateriaux
        };
  
        // Uploader les images après la création du bassin
        const uploadObservables = [];
  
        // Parcourir toutes les catégories d'images
        for (const category in this.uploadedImages) {
          if (this.uploadedImages[category].length > 0) {
            const file = this.uploadedImages[category][0];
            const imageNumber = categoryIndexMap[category as CategoryKey]; // Récupérer l'index fixe pour la catégorie
  
            console.log(`Préparation de l'upload pour ${category}: ${file.name}`); // Log pour vérifier
  
            // Uploader l'image avec le nom correct
            uploadObservables.push(this.bassinService.uploadImageFS(file, this.newBassin.idBassin, imageNumber));
          }
        }
  
        // Si des images sont à uploader
        if (uploadObservables.length > 0) {
          forkJoin(uploadObservables).subscribe(
            () => {
              Swal.fire('Succès', 'Le bassin et les images ont été ajoutés avec succès.', 'success');
              this.router.navigate(['/admin/bassin']);
            },
            (error) => {
              console.error('Erreur lors de l\'upload des images:', error); // Log pour vérifier
              Swal.fire('Erreur', 'Une erreur est survenue lors de l\'ajout des images.', 'error');
            }
          );
        } else {
          Swal.fire('Succès', 'Le bassin a été ajouté avec succès.', 'success');
          this.router.navigate(['/admin/bassin']);
        }
      },
      (error) => {
        Swal.fire('Erreur', 'Une erreur est survenue lors de l\'ajout du bassin.', 'error');
      }
    );
  }
  
  // Méthode pour vérifier si un fichier a déjà été uploadé
  isFileAlreadyUploaded(fileName: string): boolean {
    for (const category in this.uploadedImages) {
      if (this.uploadedImages[category].some(file => file.name === fileName)) {
        return true;
      }
    }
    return false;
  }*/

    files: File[] = [];
imagePreviews: string[] = [
  'assets/img/imagebassin/image1.webp',
  'assets/img/imagebassin/image2.webp',
  'assets/img/imagebassin/image3.jpg',
  'assets/img/imagebassin/image4.jpg'
];

onFileSelected(event: any, index: number) {
  const file = event.target.files[0];
  if (file) {
    this.files[index] = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreviews[index] = e.target.result;
    };
    reader.readAsDataURL(file);

    console.log(`✅ Image ${index + 1} sélectionnée:`, file.name);
  }
}

triggerFileInput(index: number) {
  const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type=file]');
  fileInputs[index]?.click();
}
    
    addBassin() {
      if (!this.newIdCategorie) {
        Swal.fire('Erreur', 'Veuillez sélectionner une catégorie.', 'error');
        return;
      }
    
      this.newBassin.categorie = this.categories.find(c => c.idCategorie === this.newIdCategorie)!;
    
      // Set default values for required backend fields
  this.newBassin.archive = false;
  this.newBassin.quantity = 0;
  this.newBassin.dateAjout = new Date();
  this.newBassin.dateDerniereModification = new Date();
  this.newBassin.promotionActive = false;

  const formData = new FormData();
  
  // Stringify the bassin object with all required properties
  formData.append('bassin', JSON.stringify({
    idBassin: this.newBassin.idBassin,
    nomBassin: this.newBassin.nomBassin,
    description: this.newBassin.description,
    prix: this.newBassin.prix,
    materiau: this.newBassin.materiau,
    couleur: this.newBassin.couleur,
    dimensions: this.newBassin.dimensions,
    disponible: this.newBassin.disponible,
    stock: this.newBassin.stock,
    categorie: { 
      idCategorie: this.newBassin.categorie.idCategorie,
      nomCategorie: this.newBassin.categorie.nomCategorie,
      description: this.newBassin.categorie.description 
    },
    image3DPath: this.newBassin.image3DPath,
    archive: this.newBassin.archive,
    quantity: this.newBassin.quantity,
    dateAjout: this.newBassin.dateAjout,
    dateDerniereModification: this.newBassin.dateDerniereModification,
    promotionActive: this.newBassin.promotionActive
  }));
  
  this.files.filter(file => file).forEach(file => {
    formData.append('images', file);
  });

    
      this.bassinService.ajouterBassinWithImg(formData).subscribe(
        (response: any) => {
          console.log('Bassin ajouté avec succès', response);
          Swal.fire('Succès', 'Bassin ajouté avec succès', 'success');

          // Rediriger en utilisant l'ID reçu dans la réponse
    this.router.navigate(['/admin/details-bassin', response.idBassin]);
        },
        (error: any) => {
          console.error('Erreur lors de l ajout du bassin', error);
          Swal.fire('Erreur', 'Erreur lors de l ajout du bassin', 'error');
        }
      );
    }
    
    trackByIndex(index: number) {
      return index;
    }

    checkGithubUrl() {
      const githubPattern = /^https:\/\/github\.com\/.+\/.+\/blob\/.+\.(glb|gltf)$/;
      this.isValidGithubUrl = githubPattern.test(this.newBassin.image3DPath);
    }
    

/*resetForm() {
  this.newBassin = {};
  this.files = [];
  this.imagePreviews = new Array(4).fill('');
}*/

  }
  