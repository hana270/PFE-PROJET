import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { Bassin } from '../../../../core/models/bassin.models';
import { BassinService } from '../../../../core/services/bassin.service';
import { BassinPersonnalise } from '../../../../core/models/bassinpersonnalise.models';
import { AuthService } from '../../../../core/authentication/auth.service';
import { BassinStateService } from '../../../../core/services/bassin-state.service';

// Validateur personnalisé pour le nom de l'accessoire
export function accessoireNameValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const value = control.value;
    if (!value) {
      return null; // Ne pas valider si le champ est vide (la validation required s'en chargera)
    }

    // Vérifier que le nom contient au moins 3 lettres
    const hasMinLength = value.length >= 3;
    // Vérifier qu'il n'y a pas de symboles
    const hasNoSymbols = /^[a-zA-Z0-9\s]+$/.test(value);

    if (!hasMinLength || !hasNoSymbols) {
      return { invalidAccessoireName: true }; // Retourner une erreur si la validation échoue
    }
    return null; // Retourner null si la validation réussit
  };
}

@Component({
  selector: 'app-bassin-personnalise',
  templateUrl: './bassin-personnalise.component.html',
  styleUrls: ['./bassin-personnalise.component.css']
})
export class BassinPersonnaliseComponent implements OnInit {
  bassinPersonnaliseForm!: FormGroup;
  bassins: Bassin[] = [];
  uploadedAccessoireImages: { [key: number]: File } = {};
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

  isBassinPersonnalise: boolean = false; // Ajoutez cette ligne

  constructor(
    private fb: FormBuilder,
    private bassinService: BassinService,
    private route: ActivatedRoute,
    private authService:AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private bassinStateService: BassinStateService
  ) {}

  ngOnInit(): void {
    this.bassinId = +this.route.snapshot.paramMap.get('id')!;
    this.bassinPersonnaliseForm = this.fb.group({
      bassin: [null],
      materiaux: this.fb.array([], [Validators.required, this.minSelectedCheckboxes(1)]), // Utiliser un FormArray pour les matériaux
      dimensions: this.fb.array([], [Validators.required, this.minSelectedCheckboxes(1)]), // Utiliser un FormArray pour les dimensions
      accessoires: this.fb.array([], [Validators.required, this.minSelectedCheckboxes(1)]), // Liste des accessoires
      dureeFabrication: [0, [Validators.required, Validators.min(1), Validators.max(30)]]
    });

    this.loadBassins();
    // Ajouter 2 accessoires par défaut
  this.addAccessoire();
  this.addAccessoire();
  }

  // Validateur pour vérifier qu'au moins une case est cochée
minSelectedCheckboxes(min: number): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const selected = (control as FormArray).controls.filter(c => c.value).length;
    return selected >= min ? null : { minSelected: { required: min, actual: selected } };
  };
}

  loadBassins(): void {
    this.bassinService.listeBassin().subscribe(
      (data) => {
        this.bassins = data;
        this.setSelectedBassin();
      },
      (error) => {
        console.error('Erreur lors du chargement des bassins', error);
      }
    );
  }

  setSelectedBassin(): void {
    const selectedBassin = this.bassins.find(b => b.idBassin === this.bassinId);
    if (selectedBassin) {
      this.bassinPersonnaliseForm.patchValue({
        bassin: selectedBassin
      });
    }
  }

  onMateriauChange(event: any, materiau: string): void {
    const materiauxArray = this.bassinPersonnaliseForm.get('materiaux') as FormArray;
    if (event.target.checked) {
      materiauxArray.push(new FormControl(materiau));
      this.selectedMateriaux.push(materiau); // Mettre à jour le tableau
    } else {
      const index = materiauxArray.controls.findIndex(ctrl => ctrl.value === materiau);
      materiauxArray.removeAt(index);
      this.selectedMateriaux = this.selectedMateriaux.filter(m => m !== materiau); // Mettre à jour le tableau
    }
  }
  
  onDimensionChange(event: any, dimension: string): void {
    const dimensionsArray = this.bassinPersonnaliseForm.get('dimensions') as FormArray;
    if (event.target.checked) {
      dimensionsArray.push(new FormControl(dimension));
      this.selectedDimensions.push(dimension); // Mettre à jour le tableau
    } else {
      const index = dimensionsArray.controls.findIndex(ctrl => ctrl.value === dimension);
      dimensionsArray.removeAt(index);
      this.selectedDimensions = this.selectedDimensions.filter(d => d !== dimension); // Mettre à jour le tableau
    }
  }

// Vérifier que chaque accessoire est valide
get accessoiresValides(): boolean {
  const accessoiresArray = this.bassinPersonnaliseForm.get('accessoires') as FormArray;
  return accessoiresArray.controls.every(ctrl => ctrl.valid);
}

  get accessoires(): FormArray {
    return this.bassinPersonnaliseForm.get('accessoires') as FormArray;
  }

  addAccessoire(): void {
    this.accessoires.push(this.fb.group({
      nomAccessoire: ['', [Validators.required, accessoireNameValidator()]],
      prixAccessoire: [null, [Validators.required, Validators.min(0)]],
      imagePath: ['', Validators.required]
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

// Vérifier que l'index est valide et que le FormGroup existe
if (this.accessoires.at(index)) {
  const imagePathControl = this.accessoires.at(index).get('imagePath');
  if (imagePathControl) {
    imagePathControl.setValue(file.name); // Mettre à jour le champ imagePath
  } else {
    console.error(`Le contrôle 'imagePath' n'existe pas pour l'accessoire à l'index ${index}`);
  }
} else {
  console.error(`L'index ${index} est invalide ou hors limites.`);
}    }
  }

  // Vérifier qu'au moins un matériau est sélectionné
get materiauxValides(): boolean {
  return this.selectedMateriaux.length > 0;
}

// Vérifier qu'au moins une dimension est sélectionnée
get dimensionsValides(): boolean {
  return this.selectedDimensions.length > 0;
}


  onSubmit(): void {
   // Marquer tous les champs comme touchés pour afficher les erreurs
  this.bassinPersonnaliseForm.markAllAsTouched();

  if (this.bassinPersonnaliseForm.invalid) {
    Swal.fire('Erreur', 'Veuillez remplir tous les champs requis correctement', 'error');
    return;
  }

  // Vérifier qu'au moins un matériau est sélectionné
  const materiauxValides = (this.bassinPersonnaliseForm.get('materiaux') as FormArray).length > 0;
  if (!materiauxValides) {
    Swal.fire('Erreur', 'Veuillez sélectionner au moins un matériau', 'error');
    return;
  }

  // Vérifier qu'au moins une dimension est sélectionnée
  const dimensionsValides = (this.bassinPersonnaliseForm.get('dimensions') as FormArray).length > 0;
  if (!dimensionsValides) {
    Swal.fire('Erreur', 'Veuillez sélectionner au moins une dimension', 'error');
    return;
  }

  // Vérifier qu'au moins un accessoire est ajouté
  const accessoiresValides = (this.bassinPersonnaliseForm.get('accessoires') as FormArray).length > 0;
  if (!accessoiresValides) {
    Swal.fire('Erreur', 'Veuillez ajouter au moins un accessoire', 'error');
    return;
  }

  // Vérifier que chaque accessoire est valide
  if (!this.accessoiresValides) {
    Swal.fire('Erreur', 'Veuillez corriger les erreurs dans les accessoires', 'error');
    return;
  }
    const formValue = this.bassinPersonnaliseForm.value;
    const bassinPersonnalise = {
      bassin: formValue.bassin,
      materiaux: this.selectedMateriaux,
      dimensions: this.selectedDimensions,
      accessoires: formValue.accessoires,
      dureeFabrication: formValue.dureeFabrication // Ajout de la durée

    };
  
    
    const formData = new FormData();
    formData.append('bassinPersonnalise', JSON.stringify(bassinPersonnalise));
  
    Object.keys(this.uploadedAccessoireImages).forEach((key) => {
      formData.append('accessoireImages', this.uploadedAccessoireImages[+key]);
    });
  
    this.bassinService.ajouterBassinPersonnalise(formData, this.bassinId).subscribe(
      (response) => {
        Swal.fire('Succès', 'Bassin personnalisé ajouté avec succès', 'success');
        console.log('Réponse du serveur après création :', response);
        //this.bassinPersonnaliseForm.reset();


        // Mettre à jour les états
    this.isBassinPersonnalise = true;
    this.bassinStateService.setBassinPersonnalise(true);
    this.cdr.detectChanges();
         // Forcer la mise à jour de l'état dans DetailsBassinComponent
      this.router.navigate(['/admin/details-bassin', this.bassinId]).then(() => {
      });
    },
      (error) => {
        Swal.fire('Erreur', 'Erreur lors de l\'ajout du bassin personnalisé', 'error');
        console.error('Erreur détaillée :', error);
      }
    );
  }

  // Déconnexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }

  //Les fonctions
  goBack(): void {
    this.router.navigate(['/admin/bassin']);
  }


  
}