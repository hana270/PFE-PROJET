import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Bassin } from '../../../../core/models/bassin.models';
import { BassinService } from '../../../../core/services/bassin.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/authentication/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bassin',
  templateUrl: './bassin.component.html',
  styleUrls: ['./bassin.component.css'],
})
export class BassinComponent implements OnInit {
  // Les variables
  bassins: Bassin[] = [];
  apiurl: string = 'http://localhost:8089/aquatresor/api';
  //p :String="C:/shared/images/";

  currentPage: number = 1;
  itemsPerPage: number = 30; // Nombre d'éléments par page
  totalPages: number = 1;
  isBrowser: boolean;

  constructor(
    private bassinService: BassinService,
    private router: Router,
    private authService: AuthService
    ,@Inject(PLATFORM_ID) private platformId: Object
  ) {

    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.chargerBassin();
    if (this.isBrowser && !this.authService.isLoggedIn) {
      this.router.navigate(['/admin/signin']);
    }
  }

  //*********** Les fonctions

 //ancien chargement
  /*chargerBassin(): void {
    this.bassinService.listeBassin().subscribe(
        (bs) => {
            console.log(bs);
            this.bassins = bs;
            this.bassins.forEach((b) => {
                // Vérifier si la catégorie est définie
                if (!b.categorie) {
                    console.warn(`Aucune catégorie trouvée pour le bassin: ${b.nomBassin}`);
                }

                // Vérifier si l'image est définie
                if (b.images && b.images.length > 0 && b.images[0]) {
                    b.imageStr = 'data:' + b.images[0].type + ';base64,' + b.images[0].image;
                } else {
                    // Utiliser une image par défaut si aucune image n'est disponible
                    b.imageStr = 'assets/default-image.png';
                    console.log(`Aucune image trouvée pour le bassin: ${b.nomBassin}`);
                }
            });
        },
        (error) => {
            console.error('Erreur lors du chargement des bassins', error);
        }
    );
}*/
chargerBassin(): void {
  this.bassinService.listeBassin().subscribe(
    (bs) => {
      console.log("Données des bassins reçues :", bs);
      this.bassins = bs;
      this.totalPages = Math.ceil(this.bassins.length / this.itemsPerPage); // Mise à jour du nombre total de pages
      this.bassins.forEach((b) => {
        if (b.imagesBassin && b.imagesBassin.length > 0) {
          b.imageStr = `http://localhost:8089/aquatresor/api/imagesBassin/getFS/${b.imagesBassin[0].imagePath}`;
        } else {
          b.imageStr = 'assets/default-image.png';
        }
      });
    },
    (error) => {
      console.error('Erreur lors du chargement des bassins', error);
    }
  );
}



  supprimerBassin(b: Bassin) {
    let conf = confirm("Etes-vous sûr ?");
    if (conf) {
        this.bassinService.supprimerBassin(b.idBassin).subscribe(
            () => {
                console.log("Bassin supprimé");
                this.chargerBassin(); // Refresh the list after deletion
            },
            (error) => {
                console.error("Erreur lors de la suppression du bassin", error);
                alert("Erreur lors de la suppression du bassin: " + error.message);
            }
        );
    }
}

  // Déconnexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }

  // Rediriger vers la page de modification
  modifierBassin(id: number): void {
    console.log('ID du bassin:', id);
    this.router.navigate(['/admin/updateBassin', id]);
  }


  // Obtenir les bassins paginés
  getPaginatedBassins(): Bassin[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.bassins.slice(startIndex, endIndex);
  }

  // Page précédente
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Page suivante
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

}