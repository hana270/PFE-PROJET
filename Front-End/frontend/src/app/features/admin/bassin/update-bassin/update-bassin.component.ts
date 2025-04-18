import { ChangeDetectorRef, Component } from '@angular/core';
import { Bassin } from '../../../../core/models/bassin.models';
import { ActivatedRoute, Router } from '@angular/router';
import { BassinService } from '../../../../core/services/bassin.service';
import { Categorie } from '../../../../core/models/categorie.models';
import { ImageBassin } from '../../../../core/models/image.models';
import { AuthService } from '../../../../core/authentication/auth.service';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-update-bassin',
  templateUrl: './update-bassin.component.html',
  styleUrl: './update-bassin.component.css'
})
export class UpdateBassinComponent {
  
  // Les variables
  currentBassin = new Bassin();
  categories!: Categorie[];
  updateCategorieId!: number;
  myImage!: string;
  uploadedImage!: File;
  isImageUpdated: Boolean = false;
  previousStock!: number;
  // Liste des couleurs possibles
  couleurs: string[] = ['Bleu clair', 'Bleu foncé', 'Blanc', 'Gris clair', 'Gris foncé',
  'Beige', 'Sable', 'Vert', 'Rouge', 'Noir', 'Marron'];
  // Liste des matériaux possibles
  materiaux: string[] = ['Béton', 'Acier', 'PVC', 'Bois', 'Pierre', 'Carrelage', 'Fibre de verre'];
  imageMessage!:string;

  hover: boolean[] = [];


  /*imagePreviews: string[] = new Array(4).fill('');
  files: File[] = [];*/

  //Constructor
  constructor(private activatedRoute: ActivatedRoute, 
              private router: Router, 
              private bassinService: BassinService,
              private authService:AuthService,
              private cdr: ChangeDetectorRef 
            ) {}

  ngOnInit(): void {
    this.bassinService.listeCategories().subscribe(cats => {
      this.categories = cats;
    });
    this.bassinService.consulterBassin(this.activatedRoute.snapshot.params['id'])
    .subscribe(b => {
      this.currentBassin = b;
      this.previousStock = b.stock;
      
      // Vérification avant d'accéder à `b.categorie`
      if (b.categorie) {
        this.updateCategorieId = b.categorie.idCategorie;
      }

      // Assurer que la couleur est bien sélectionnée
      if (!this.couleurs.includes(this.currentBassin.couleur)) {
        this.currentBassin.couleur = this.couleurs[0]; // Mettre une valeur par défaut si besoin
      }

      // Assurer que le matériau est bien sélectionné
      if (!this.materiaux.includes(this.currentBassin.materiau)) {
        this.currentBassin.materiau = this.materiaux[0]; // Valeur par défaut si nécessaire
      }

      if (b.imagesBassin && b.imagesBassin.length > 0) {
        this.imagePreviews = b.imagesBassin.map(img => `http://localhost:8089/aquatresor/api/imagesBassin/getFS/${img.imagePath}`);
      }

      console.log('Bassin chargé:', b); // Inspectez le bassin chargé
      console.log('Images du bassin:', b.imagesBassin); // Inspectez les images chargées
    });
  }
  
  
  //** Bassin **/
  //ancienne
  /*updateBassin() { 
    this.currentBassin.categorie = this.categories.find(cat => 
      cat.idCategorie == this.updateCategorieId)!; 
    this.bassinService.updateBassin(this.currentBassin)
      .subscribe((b) => { 
        this.router.navigate(['/admin/bassin']); 
      }); 
  }*/

      files: File[] = [];
      imagePreviews: string[] = []; // Liste des prévisualisations
      
      triggerFileInput(index: number) {
        const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type=file]');
        fileInputs[index]?.click();
      }
      
      onFileSelected(event: any, index: number) {
        const file = event.target.files[0];
        if (file) {
          Swal.fire({
            title: 'Voulez-vous vraiment modifier cette image ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Oui, Modifier',
            cancelButtonText: 'Non'
          }).then((result) => {
            if (result.isConfirmed) {
              this.files[index] = file;
      
              const reader = new FileReader();
              reader.onload = (e: any) => {
                this.imagePreviews[index] = e.target.result;
              };
              reader.readAsDataURL(file);
      
              Swal.fire('Succès', 'Image modifiée avec succès', 'success');
            }
          });
        }
      }
      
      updateBassin() {
        if (!this.currentBassin.nomBassin || !this.currentBassin.prix) {
            Swal.fire('Erreur !', 'Veuillez remplir tous les champs obligatoires.', 'error');
            return;
        }
    
        // Renommer les fichiers pour correspondre au format attendu par le backend
        const renamedFiles = this.files.map((file, index) => {
            if (file) {
                const extension = file.name.split('.').pop(); // Extraire l'extension du fichier
                const newFileName = `${this.currentBassin.idBassin}_${index + 1}.${extension}`; // Format : "id_index.extension"
                return new File([file], newFileName, { type: file.type });
            }
            return file;
        });
    
        //Modifier la catégorie
        this.currentBassin.categorie = this.categories.find(cat => cat.idCategorie == this.updateCategorieId)!;

        // Envoyer la requête de mise à jour au backend
        this.bassinService.updateBassinWithImg(this.currentBassin, renamedFiles).subscribe(
            (updatedBassin) => {
                // Mettre à jour le bassin actuel avec les données retournées par le backend
                this.currentBassin = updatedBassin;
    
                // Mettre à jour imagePreviews avec les nouvelles URLs des images
                this.imagePreviews = this.currentBassin.imagesBassin.map((img, index) => {
                    const fileName = img.imagePath.split('/').pop(); // Extraire le nom du fichier
                    return `http://localhost:8089/aquatresor/api/imagesBassin/getFS/${fileName}`;
                });
    
                // Afficher un message de succès
                Swal.fire('Succès !', 'Le bassin a été mis à jour avec succès.', 'success');
    
                // Rediriger vers la page de détail de bassin
                this.router.navigate(['/admin/details-bassin', this.currentBassin.idBassin]);
              },
            (error) => {
                // Afficher un message d'erreur en cas d'échec
                Swal.fire('Erreur !', 'Erreur lors de la mise à jour du bassin.', 'error');
                console.error(error);
            }
        );
    }
      
      
      
      trackByIndex(index: number) {
        return index;
      } 


      
  
  //compare l'ancien stock et met à jour la disponibilité
  onStockChange(): void {
    if (this.currentBassin.stock !== this.previousStock) {
      this.currentBassin.disponible = this.currentBassin.stock > 0;
    }
  }

  get isDisponible(): boolean {
    return this.currentBassin.stock > 0;
  }  

  //** Image **//
  //ancienne
  /*onImageUpload(event: any) {
    if (event.target.files && event.target.files.length) {
      this.uploadedImage = event.target.files[0];
      this.isImageUpdated = true;

      const reader = new FileReader();
      reader.readAsDataURL(this.uploadedImage);
      reader.onload = () => {
        this.myImage = reader.result as string;
      };
    }
  }*/
    onImageUpload(event: any) {
      if (event.target.files && event.target.files.length) {
        const files = event.target.files;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            this.uploadedImage = file;
            this.myImage = reader.result as string;
          };
        }
      }
    }

  //ancienne
  /*onAddImageBassin() {
    this.bassinService.uploadImageFS(this.uploadedImage, this.uploadedImage.name, this.currentBassin.idBassin)
      .subscribe((img: ImageBassin) => {
        this.currentBassin.imagesBassin.push(img);
        this.isImageUpdated = true; // Marquer que l'image a été mise à jour
      });
  }*/

      onAddImageBassin() {
        if (!this.uploadedImage) {
          this.imageMessage = "Veuillez sélectionner une image avant de cliquer sur 'Ajouter Image'.";
          return;
        }
      
       /*this.bassinService.uploadImageFS(this.uploadedImage, this.currentBassin.idBassin)
          .subscribe(
            (img: ImageBassin) => {
              this.currentBassin.imagesBassin.push(img);
              this.isImageUpdated = true;
              this.imageMessage = "L'image a été ajoutée avec succès.";
      
              // Rafraîchir les données du bassin
              this.bassinService.consulterBassin(this.currentBassin.idBassin)
                .subscribe((bassin) => {
                  this.currentBassin = bassin;
                });
            },
            (error) => {
              this.imageMessage = "Erreur lors de l'ajout de l'image. Veuillez réessayer.";
              console.error("Erreur lors de l'ajout de l'image :", error);
            }
          );*/
      }

  //ancienne
  /*supprimerImage(img: ImageBassin) {
    let conf = confirm("Êtes-vous sûr ?");
    if (conf) {
      this.bassinService.supprimerImage(img.idImage)
        .subscribe(() => {
          // Supprimer l'image du tableau currentBassin.images
          const index = this.currentBassin.imagesBassin.indexOf(img, 0);
          if (index > -1) {
            this.currentBassin.imagesBassin.splice(index, 1);
          }
          // Afficher un message de succès ou effectuer d'autres actions si nécessaire
          Swal.fire({
            title: 'Succès!',
            text: 'L\'image a été supprimée avec succès.',
            icon: 'success',
            confirmButtonText: 'OK'
          });
        }, (error) => {
          // Gérer les erreurs si nécessaire
          Swal.fire({
            title: 'Erreur!',
            text: 'Une erreur s\'est produite lors de la suppression de l\'image.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        });
    }
  }*/

    supprimerImage(img: ImageBassin) {
      let conf = confirm("Êtes-vous sûr ?");
      if (conf) {
        this.bassinService.supprimerImage(img.idImage)
          .subscribe(
            () => {
              const index = this.currentBassin.imagesBassin.indexOf(img, 0);
              if (index > -1) {
                this.currentBassin.imagesBassin.splice(index, 1);
              }
              Swal.fire({
                title: 'Succès!',
                text: 'L\'image a été supprimée avec succès.',
                icon: 'success',
                confirmButtonText: 'OK'
              });
            },
            (error) => {
              Swal.fire({
                title: 'Erreur!',
                text: 'Une erreur s\'est produite lors de la suppression de l\'image.',
                icon: 'error',
                confirmButtonText: 'OK'
              });
              console.error("Erreur lors de la suppression de l'image :", error);
            }
          );
      }
    }

   // Déconnexion
   logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }



}