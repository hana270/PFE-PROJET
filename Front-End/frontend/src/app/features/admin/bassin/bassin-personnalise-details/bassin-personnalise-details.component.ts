import { Component, OnInit } from '@angular/core';
import { BassinPersonnalise } from '../../../../core/models/bassinpersonnalise.models';
import { BassinService } from '../../../../core/services/bassin.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/authentication/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bassin-personnalise-details',
  templateUrl: './bassin-personnalise-details.component.html',
  styleUrls: ['./bassin-personnalise-details.component.css']
})
export class BassinPersonnaliseDetailsComponent implements OnInit {
  bassinPersonnalise: BassinPersonnalise = {
    idBassinPersonnalise: 0,
    idBassin: 0, // ID du bassin associé
    materiaux: [], // Liste des matériaux sélectionnés
    dimensions: [], // Liste des dimensions sélectionnées
    accessoires: [], // Liste des accessoires
    dureeFabrication: 0,
    isCustomized: false,
    nomBassin: '',
    prix: 0,
    imagesBassin: [],
    firstImageUrl: ''
  };

  loading: boolean = true; // Indicateur de chargement
  error: boolean = false; // Indicateur d'erreur

  constructor(
    private route: ActivatedRoute,
    private bassinService: BassinService,
    private router: Router,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.getBassinDetails();
  }

  // Récupérer les détails du bassin personnalisé
  getBassinDetails(): void {
    const id = +this.route.snapshot.paramMap.get('id')!; // Récupérer l'ID depuis l'URL
    console.log('ID du bassin récupéré depuis l\'URL :', id);
    this.loading = true;
    this.error = false;

    this.bassinService.consulterBassinPersonnalise(id).subscribe({
      next: (bassinPersonnalise: BassinPersonnalise) => {
        console.log('Réponse du serveur :', bassinPersonnalise);
        this.bassinPersonnalise = bassinPersonnalise;
        this.loading = false;
        console.log("Bassin personnalisé chargé :", this.bassinPersonnalise);
      },
      error: (error) => {
        this.loading = false;
        this.error = true;
        console.error('Erreur lors du chargement des détails du bassin personnalisé', error);
        Swal.fire('Erreur', 'Impossible de charger les détails du bassin personnalisé', 'error');
      }
    });
  }

  // Supprimer le bassin personnalisé
  supprimerBassinPersonnalise(): void {
    const id = this.bassinPersonnalise.idBassinPersonnalise;

    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: "Vous ne pourrez pas revenir en arrière !",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer !'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bassinService.supprimerBassinPersonnalise(id).subscribe({
          next: () => {
            Swal.fire('Supprimé !', 'Le bassin personnalisé a été supprimé.', 'success');
            this.router.navigate(['/admin/bassin']); // Rediriger vers la liste des bassins
          },
          error: (error) => {
            Swal.fire('Erreur', 'Une erreur s\'est produite lors de la suppression du bassin personnalisé', 'error');
            console.error('Erreur lors de la suppression du bassin personnalisé', error);
          }
        });
      }
    });
  }

  // Retour à la page précédente
  goBack(): void {
    this.router.navigate(['/admin/bassins']);
  }

  // Déconnexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }
}