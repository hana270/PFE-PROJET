import { Component } from '@angular/core';
import { BassinPersonnalise } from '../../../../core/models/bassinpersonnalise.models';
import { ActivatedRoute, Router } from '@angular/router';
import { BassinService } from '../../../../core/services/bassin.service';
import Swal from 'sweetalert2';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/authentication/auth.service';

@Component({
  selector: 'app-bassin-personnalise-update',
  templateUrl: './bassin-personnalise-update.component.html',
  styleUrl: './bassin-personnalise-update.component.css'
})
export class BassinPersonnaliseUpdateComponent {
  bassinPersonnaliseForm!: FormGroup;
  uploadedAccessoireImages: { [key: number]: File } = {};
  bassinPersonnalise: BassinPersonnalise = {
    idBassinPersonnalise: 0,
    idBassin: 0,
    materiaux: [],
    dimensions: [],
    accessoires: [],
    dureeFabrication: 0,
  };

  // Propriété pour stocker l'ID du bassin
  bassinId!: number;

  // Tableaux pour stocker les sélections
  selectedMateriaux: string[] = [];
  selectedDimensions: string[] = [];

  listeMateriaux: string[] = [
    "Béton fibré haute performance",
    "Polyéthylène haute densité (PEHD)",
    "Composite verre-résine",
    "Acier inoxydable 316L (marine)",
    "Tôle d'acier galvanisé à chaud",
    "PVC renforcé",
    "Membrane EPDM épaisseur 1.5mm",
    "Géomembrane HDPE",
    "Pierre reconstituée",
    "Fibre de carbone",
    "Bâche armée PVC 900g/m²",
    "Polypropylène expansé",
    "Béton polymère",
    "Aluminium anodisé",
    "Titane grade 2",
    "Bois composite",
    "Résine époxy renforcée"
  ];

  listeDimensions: string[] = [
    "150x100x80 cm (≈ 1 200L)",
    "180x120x90 cm (≈ 1 944L)",
    "200x150x100 cm (≈ 3 000L)",
    "250x180x120 cm (≈ 5 400L)",
    "300x200x150 cm (≈ 9 000L)",
    "350x250x150 cm (≈ 13 125L)",
    "400x300x200 cm (≈ 24 000L)",
    "500x350x200 cm (≈ 35 000L)",
    "600x400x250 cm (≈ 60 000L)",
    "700x500x300 cm (≈ 105 000L)",
    "800x600x350 cm (≈ 168 000L)",
    "1000x700x400 cm (≈ 280 000L)"
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private bassinService: BassinService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Récupérer l'ID du bassin personnalisé depuis l'URL
    const idBassinn = +this.route.snapshot.paramMap.get('id')!;
    console.log('ID du bassin récupéré :', idBassinn); // Debug

    if (isNaN(idBassinn)) {
      console.error('ID du bassin personnalisé invalide');
      this.router.navigate(['/admin/bassin-personnalise']); // Rediriger en cas d'erreur
      return;
    }

    this.bassinId = idBassinn; // Stocker l'ID pour une utilisation ultérieure

    // Initialiser le formulaire
    this.bassinPersonnaliseForm = this.fb.group({
      idBassinPersonnalise: [0],
      idBassin: [this.bassinId], // Ajouter l'ID du bassin au formulaire
      materiaux: this.fb.array([]),
      dimensions: this.fb.array([]),
      accessoires: this.fb.array([]),
      dureeFabrication: [0, [Validators.required, Validators.min(1), Validators.max(30)]] // Ajout du champ avec validation
    });

    // Charger les détails du bassin personnalisé
    this.chargerBassinPersonnalise(this.bassinId);
  }

  // Charger les détails du bassin personnalisé
  chargerBassinPersonnalise(id: number): void {
    this.bassinService.consulterBassinPersonnalise(id).subscribe({
      next: (bassinPersonnalise) => {
        this.bassinPersonnalise = bassinPersonnalise;
        this.selectedMateriaux = bassinPersonnalise.materiaux;
        this.selectedDimensions = bassinPersonnalise.dimensions;

        // Construire les URLs des images des accessoires pour l'affichage
        bassinPersonnalise.accessoires = bassinPersonnalise.accessoires.map(accessoire => {
          const fileName = this.getFileNameFromPath(accessoire.imagePath); // Extraire le nom du fichier
          accessoire.imageUrl = `${this.bassinService.apiURL}/imagespersonnalise/${fileName}`; // Construire l'URL complète
          return accessoire;
        });

        // Pre-fill the form with existing data
        this.bassinPersonnaliseForm.patchValue({
          idBassinPersonnalise: bassinPersonnalise.idBassinPersonnalise,
          idBassin: this.bassinId, // Ensure this is set
          materiaux: bassinPersonnalise.materiaux,
          dimensions: bassinPersonnalise.dimensions,
          dureeFabrication: bassinPersonnalise.dureeFabrication // Ajout de la durée
        });

        // Add existing accessories to the FormArray
        bassinPersonnalise.accessoires.forEach((accessoire: any) => {
          this.accessoires.push(this.fb.group({
            idAccessoire: [accessoire.idAccessoire], // Include the ID of the accessory
            nomAccessoire: [accessoire.nomAccessoire],
            prixAccessoire: [accessoire.prixAccessoire],
            imagePath: [accessoire.imagePath], // Utiliser imagePath pour le backend
            imageUrl: [accessoire.imageUrl]   // Utiliser imageUrl pour l'affichage
          }));
        });
      },
      error: (error) => {
        console.error('Erreur lors du chargement des détails du bassin personnalisé', error);
        Swal.fire('Erreur', 'Impossible de charger les détails du bassin personnalisé', 'error');
      }
    });
  }

  getFileNameFromPath(path: string): string {
    return path.split('/').pop() || '';
  }

  // Gestion des matériaux
  onMateriauChange(event: any, materiau: string): void {
    if (event.target.checked) {
      this.selectedMateriaux.push(materiau);
    } else {
      this.selectedMateriaux = this.selectedMateriaux.filter(m => m !== materiau);
    }
    this.bassinPersonnaliseForm.patchValue({
      materiaux: this.selectedMateriaux
    });
  }

  // Gestion des dimensions
  onDimensionChange(event: any, dimension: string): void {
    if (event.target.checked) {
      this.selectedDimensions.push(dimension);
    } else {
      this.selectedDimensions = this.selectedDimensions.filter(d => d !== dimension);
    }
    this.bassinPersonnaliseForm.patchValue({
      dimensions: this.selectedDimensions
    });
  }

  // Vérifier qu'au moins un matériau est sélectionné
  get materiauxValides(): boolean {
    return this.selectedMateriaux.length > 0;
  }

  // Vérifier qu'au moins une dimension est sélectionnée
  get dimensionsValides(): boolean {
    return this.selectedDimensions.length > 0;
  }

  get accessoires(): FormArray {
    return this.bassinPersonnaliseForm.get('accessoires') as FormArray;
  }

  addAccessoire(): void {
    this.accessoires.push(this.fb.group({
      nomAccessoire: [''],
      prixAccessoire: [null],
      imagePath: [''], // Utiliser imagePath pour le backend
      imageUrl: [''],   // Utiliser imageUrl pour l'affichage
      imageModified: [false] // Indicateur pour savoir si l'image a été modifiée
    }));
  }

  removeAccessoire(index: number): void {
    this.accessoires.removeAt(index);
    delete this.uploadedAccessoireImages[index];
  }

  onAccessoireImageUpload(event: any, index: number): void {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      this.uploadedAccessoireImages[index] = file;

      // Mettre à jour l'URL de l'image dans le formulaire pour l'affichage
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.accessoires.at(index).get('imageUrl')?.setValue(e.target.result);
      };
      reader.readAsDataURL(file);

      // Marquer l'image comme modifiée
      this.accessoires.at(index).get('imageModified')?.setValue(true);

      // Afficher un message de débogage
      console.log(`Image téléchargée pour l'accessoire à l'index ${index} :`, file.name);
    }
  }

  // Mettre à jour le bassin personnalisé
  mettreAJourBassinPersonnalise(): void {
    const formValue = this.bassinPersonnaliseForm.value;
    console.log("dans la fct mettre à jour", this.bassinPersonnalise.idBassin);

    const bassinPersonnalise = {
      idBassinPersonnalise: formValue.idBassinPersonnalise,
      idBassin: this.bassinId, // Ensure this is set correctly
      materiaux: this.selectedMateriaux,
      dimensions: this.selectedDimensions,
      dureeFabrication: formValue.dureeFabrication, // Ajout de la durée
      accessoires: formValue.accessoires.map((accessoire: any) => ({
        idAccessoire: accessoire.idAccessoire,
        nomAccessoire: accessoire.nomAccessoire,
        prixAccessoire: accessoire.prixAccessoire,
        imagePath: accessoire.imagePath, // Envoyer imagePath au backend
        imageModified: accessoire.imageModified // Indicateur pour savoir si l'image a été modifiée
      }))
    };

    // Afficher le JSON du bassin personnalisé dans la console
  console.log("Bassin personnalisé JSON envoyé au backend :", JSON.stringify(bassinPersonnalise, null, 2));

    const formData = new FormData();
    formData.append('bassinPersonnalise', JSON.stringify(bassinPersonnalise));

    // Add accessory images
    Object.keys(this.uploadedAccessoireImages).forEach((key) => {
      const index = +key;
      if (this.accessoires.at(index).get('imageModified')?.value) {
        formData.append('accessoireImages', this.uploadedAccessoireImages[index]);
      }
    });
  

    // Afficher les données du formulaire avant envoi
    console.log("Données envoyées au backend :");
    formData.forEach((value, key) => {
      if (key === 'bassinPersonnalise') {
        console.log(key, JSON.parse(value as string)); // Afficher l'objet bassinPersonnalise
      } else {
        console.log(key, value); // Afficher les fichiers images
      }
    });

    // Send the request
    this.bassinService.mettreAJourBassinPersonnalise(bassinPersonnalise.idBassinPersonnalise, formData).subscribe({
      next: () => {
        Swal.fire('Succès', 'Le bassin personnalisé a été mis à jour avec succès', 'success');
        // Rediriger vers la page de détail du bassin personnalisé
        this.router.navigate([`/admin/detail-bassin-personnalise/${bassinPersonnalise.idBassin}`]);
      },
      error: (error) => {
        Swal.fire('Erreur', 'Une erreur s\'est produite lors de la mise à jour du bassin personnalisé', 'error');
        console.error('Erreur lors de la mise à jour du bassin personnalisé', error);
      }
    });
  }

  // Méthode pour annuler et revenir à la page précédente
  annuler(): void {
    this.router.navigate(['/admin/bassin-personnalise']); // Remplacez par l'URL souhaitée
  }

  // Déconnexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }
}