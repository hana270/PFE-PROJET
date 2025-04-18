import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Promotion } from '../../../../core/models/promotion.model';
import { PromotionService } from '../../../../core/services/promotion.service';
import { BassinService } from '../../../../core/services/bassin.service';
import { CategorieService } from '../../../../core/services/categorie.service';
import Swal from 'sweetalert2';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-add-promotion',
  templateUrl: './add-promotion.component.html',
  styleUrls: ['./add-promotion.component.scss']
})
export class AddPromotionComponent implements OnInit {
  promotion: Promotion = new Promotion();
  bassins: any[] = [];
  categories: any[] = [];
  
  // Pour la gestion des sélections
  selectedBassinIds: number[] = [];
  selectedCategorieIds: number[] = [];
  
  // Pour la recherche
  bassinSearchTerm: string = '';
  categorieSearchTerm: string = '';
  dateDebutError: string = '';
  dateFinError: string = '';
  heureDebut: string = '00:00';
  heureFin: string = '00:00';

  // Propriétés supplémentaires pour gérer les dates et heures
  dateDebutString!: string;
  dateFinString!: string;

  // Pagination pour les bassins
  currentBassinPage: number = 1;
  bassinsPerPage: number = 20; // Nombre de bassins par page
  paginatedBassins: any[] = [];

  // Ajouter des propriétés pour gérer les bassins et catégories en promotion
  overlappingBassins: Map<number, any> = new Map();
  overlappingCategories: Map<number, any> = new Map();
  showOverlappingWarning: boolean = false;

    // New property for reduction rate validation
    reductionRateError: string = '';


  constructor(
    private promotionService: PromotionService,
    private bassinService: BassinService,
    private categorieService: CategorieService,
    private router: Router,
    private notificationService: NotificationService 
  ) { }

  ngOnInit(): void {
    this.loadBassins();
    this.loadCategories();
    
    // Initialize the dates
    const today = new Date();
    this.dateDebutString = this.formatDateForInput(today);
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.dateFinString = this.formatDateForInput(nextMonth);
    
    // Call checkOverlaps when everything is loaded
    setTimeout(() => this.checkOverlaps(), 500);
  }

  // Méthode pour charger les bassins avec pagination
  loadBassins(): void {
    this.bassinService.getAllBassins().subscribe({
      next: (data) => {
        this.bassins = data;
        this.updatePaginatedBassins(); // Mettre à jour les bassins paginés
      },
      error: (err) => {
        console.error('Erreur lors du chargement des bassins', err);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors du chargement des bassins. Veuillez réessayer.',
        });
      }
    });
  }

  // Mettre à jour les bassins paginés
  updatePaginatedBassins(): void {
    const startIndex = (this.currentBassinPage - 1) * this.bassinsPerPage;
    const endIndex = startIndex + this.bassinsPerPage;
    this.paginatedBassins = this.filteredBassins.slice(startIndex, endIndex);
  }

  // Méthode pour changer de page
  changeBassinPage(page: number): void {
    this.currentBassinPage = page;
    this.updatePaginatedBassins();
  }

// Modifier la méthode checkOverlaps comme suit :
checkOverlaps(): void {
  if (!this.dateDebutString || !this.dateFinString) {
    this.resetOverlaps();
    return;
  }

  const dateDebut = new Date(`${this.dateDebutString}T${this.heureDebut}`);
  const dateFin = new Date(`${this.dateFinString}T${this.heureFin}`);
  
  if (dateFin <= dateDebut) {
    this.resetOverlaps();
    return;
  }

  // Vérifier tous les bassins (pas seulement ceux sélectionnés)
  const checkData = {
    bassins: this.bassins.map(b => b.idBassin), // Tous les bassins
    categories: this.categories.map(c => c.idCategorie), // Toutes les catégories
    dateDebut: dateDebut.toISOString(),
    dateFin: dateFin.toISOString(),
    promotionId: this.promotion.idPromotion || 0
  };

  this.promotionService.checkOverlappingPromotions(checkData).subscribe({
    next: (response) => {
      this.overlappingBassins = new Map();
      this.overlappingCategories = new Map();
      
      // Stocker tous les chevauchements, pas seulement pour les sélections
      if (response.bassins) {
        response.bassins.forEach((item: any) => {
          this.overlappingBassins.set(item.id, item);
        });
      }
      
      if (response.categories) {
        response.categories.forEach((item: any) => {
          this.overlappingCategories.set(item.id, item);
        });
      }
      
      // Avertir seulement si les éléments sélectionnés sont en conflit
      const selectedOverlaps = this.selectedBassinIds.some(id => this.overlappingBassins.has(id)) || 
                             this.selectedCategorieIds.some(id => this.overlappingCategories.has(id));
      this.showOverlappingWarning = selectedOverlaps;
    },
    error: (err) => {
      console.error('Erreur vérification chevauchements', err);
      this.resetOverlaps();
    }
  });
}

// Ajouter cette méthode pour réinitialiser les chevauchements
private resetOverlaps(): void {
  this.overlappingBassins = new Map();
  this.overlappingCategories = new Map();
  this.showOverlappingWarning = false;
}

// Modifier les méthodes de gestion des dates/heures pour déclencher la vérification
onDateChange(): void {
  this.validateDateDebut();
  this.validateDateFin();
  this.checkOverlaps(); // Vérifier immédiatement après changement
}

onTimeChange(): void {
  this.checkOverlaps(); // Vérifier immédiatement après changement
}

// Modifier la méthode validateReductionRate :
validateReductionRate(): void {
  const rate = this.promotion.tauxReduction;
  
  if (rate === null || rate === undefined || isNaN(rate)) {
    this.reductionRateError = 'Le taux de réduction est requis.';
    return;
  }

  if (rate < 1 || rate > 100) {
    this.reductionRateError = 'Le taux de réduction doit être compris entre 1% et 100%.';
    return;
  }

  this.reductionRateError = '';
}

// Modifier la méthode onSubmit :
onSubmit(): void {
  // Valider le taux de réduction
  this.validateReductionRate();
  if (this.reductionRateError) {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: this.reductionRateError,
    });
    return;
  }

  // Valider les dates
  if (!this.validateDates()) {
    return;
  }

  // Valider les sélections
  if (!this.validateSelections()) {
    return;
  }

  // Convertir les dates
  const dateDebut = new Date(`${this.dateDebutString}T${this.heureDebut}`);
  const dateFin = new Date(`${this.dateFinString}T${this.heureFin}`);
  
  // Créer l'objet promotion
  const promotionToCreate = {
    ...this.promotion,
    dateDebut: dateDebut.toISOString(),
    dateFin: dateFin.toISOString(),
    bassins: this.selectedBassinIds,
    categories: this.selectedCategorieIds,
    tauxReduction: this.promotion.tauxReduction / 100 // Convertir en décimal
  };

  console.log('Détails de la promotion à créer:', promotionToCreate);

  // Envoyer la promotion au serveur
  this.promotionService.createPromotion(promotionToCreate).subscribe({
    next: (data) => {
      console.log('Promotion créée avec succès:', data);
      this.notificationService.notifyPromotionUpdate(); // Notifier la mise à jour
      
      // Vérifier si la notification fonctionne correctement
      console.log('Notification envoyée pour mise à jour de la liste');
      
      Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: 'La promotion a été créée avec succès.',
      }).then(() => {
        this.router.navigate(['/admin/promotions']);
      });
    },
    error: (err) => {
      console.error('Erreur lors de la création de la promotion', err);
      let errorMessage = 'Une erreur est survenue lors de la création de la promotion.';
      
      if (err.error && err.error.message) {
        errorMessage = err.error.message;
      } else if (err.status === 403) {
        errorMessage = "Vous n'avez pas les autorisations nécessaires.";
      } else if (err.status === 409) {
        errorMessage = "Conflit: Des chevauchements existent avec d'autres promotions.";
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: errorMessage,
      });
    }
  });
}



  // Méthode pour formater une date au format YYYY-MM-DD
  formatDateForInput(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  // Méthode pour formater une heure au format HH:MM
  formatTimeForInput(date: Date): string {
    if (!date) return '00:00';
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    return `${hours}:${minutes}`;
  }

 // Méthode pour valider la date de début
validateDateDebut(): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(this.dateDebutString);

  if (selectedDate < today) {
    this.dateDebutError = 'La date de début ne peut pas être dans le passé.';
  } else {
    this.dateDebutError = '';
  }
  
  this.checkOverlaps(); // Vérifier les chevauchements après la validation
}

// Méthode pour valider la date de fin
validateDateFin(): void {
  const dateDebut = new Date(`${this.dateDebutString}T${this.heureDebut}`);
  const dateFin = new Date(`${this.dateFinString}T${this.heureFin}`);

  if (dateFin <= dateDebut) {
    this.dateFinError = 'La date et l\'heure de fin doivent être après la date et l\'heure de début.';
  } else {
    this.dateFinError = '';
  }

  // Valider la durée minimale (au moins 1 heure)
  const durationInHours = (dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60);
  if (durationInHours < 1) {
    this.dateFinError = 'La promotion doit durer au moins 1 heure.';
  }

  this.checkOverlaps(); // Vérifier les chevauchements après la validation
}

  

  // Validation des dates et heures
  validateDates(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ignorer l'heure pour la comparaison

    const dateDebut = new Date(`${this.dateDebutString}T${this.heureDebut}`);
    const dateFin = new Date(`${this.dateFinString}T${this.heureFin}`);

    if (dateDebut < today) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'La date de début ne peut pas être dans le passé.',
      });
      return false;
    }

    if (dateFin <= dateDebut) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'La date de fin doit être après la date de début.',
      });
      return false;
    }

    return true;
  }

  // Getters pour filtrer les bassins et catégories selon la recherche
  get filteredBassins(): any[] {
    if (!this.bassinSearchTerm) {
      return this.bassins;
    }
    
    const searchTerm = this.bassinSearchTerm.toLowerCase();
    return this.bassins.filter(bassin => 
      bassin.nomBassin.toLowerCase().includes(searchTerm)
    );
  }

  validateSelections(): boolean {
    if (this.selectedBassinIds.length === 0 && this.selectedCategorieIds.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Vous devez sélectionner au moins un bassin ou une catégorie.',
      });
      return false;
    }
    return true;
  }
  
  get filteredCategories(): any[] {
    if (!this.categorieSearchTerm) {
      return this.categories;
    }
    
    const searchTerm = this.categorieSearchTerm.toLowerCase();
    return this.categories.filter(categorie => 
      categorie.nomCategorie.toLowerCase().includes(searchTerm)
    );
  }

  loadCategories(): void {
    this.categorieService.getAllCategories().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des catégories', err);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors du chargement des catégories. Veuillez réessayer.',
        });
      }
    });
  }

  // Méthodes pour la gestion des sélections de bassins
  isBassinSelected(bassinId: number): boolean {
    return this.selectedBassinIds.includes(bassinId);
  }

  toggleBassinSelection(bassinId: number): void {
    const index = this.selectedBassinIds.indexOf(bassinId);
    if (index === -1) {
      this.selectedBassinIds.push(bassinId);
    } else {
      this.selectedBassinIds.splice(index, 1);
    }
    
    this.checkOverlaps();
  }

  selectAllBassins(): void {
    this.selectedBassinIds = this.filteredBassins.map(bassin => bassin.idBassin);
  }

  deselectAllBassins(): void {
    this.selectedBassinIds = [];
  }

  // Méthodes pour la gestion des sélections de catégories
  isCategorieSelected(categorieId: number): boolean {
    return this.selectedCategorieIds.includes(categorieId);
  }

  toggleCategorieSelection(categorieId: number): void {
    const index = this.selectedCategorieIds.indexOf(categorieId);
    if (index === -1) {
      this.selectedCategorieIds.push(categorieId);
    } else {
      this.selectedCategorieIds.splice(index, 1);
    }
    
    this.checkOverlaps();
  }

  selectAllCategories(): void {
    this.selectedCategorieIds = this.filteredCategories.map(categorie => categorie.idCategorie);
  }

  deselectAllCategories(): void {
    this.selectedCategorieIds = [];
  }

// Méthode pour obtenir le nombre total de pages pour les bassins
getTotalBassinPages(): number {
  return Math.ceil(this.filteredBassins.length / this.bassinsPerPage);
}

// Méthode pour obtenir les numéros de page à afficher
getBassinPages(): number[] {
  const totalPages = this.getTotalBassinPages();
  return Array.from({ length: totalPages }, (_, i) => i + 1);
}
  goBack(): void {
    this.router.navigate(['/admin/promotions']);
  }

  // Vérifier si un bassin est en chevauchement
isBassinOverlapping(bassinId: number): boolean {
  return this.overlappingBassins.has(bassinId);
}

// Obtenir les détails de la promotion en chevauchement pour un bassin
getBassinOverlappingInfo(bassinId: number): any {
  return this.overlappingBassins.get(bassinId);
}
 // Sélectionner tous les bassins de la page actuelle
 selectAllBassinsOnPage(): void {
  this.paginatedBassins.forEach(bassin => {
    if (!this.isBassinOverlapping(bassin.idBassin) && !this.isBassinSelected(bassin.idBassin)) {
      this.selectedBassinIds.push(bassin.idBassin);
    }
  });
  this.checkOverlaps();
}
// Vérifier si une catégorie est en chevauchement
isCategorieOverlapping(categorieId: number): boolean {
  return this.overlappingCategories.has(categorieId);
}

// Obtenir les détails de la promotion en chevauchement pour une catégorie
getCategorieOverlappingInfo(categorieId: number): any {
  return this.overlappingCategories.get(categorieId);
}



// Ajouter cette méthode pour forcer la création malgré les chevauchements
forceCreatePromotion(): void {
  this.showOverlappingWarning = false;
  this.onSubmit();
}

// Ajouter ces méthodes utilitaires
getBassinName(bassinId: number): string {
  const bassin = this.bassins.find(b => b.idBassin === bassinId);
  return bassin ? bassin.nomBassin : '';
}

getCategorieName(categorieId: number): string {
  const categorie = this.categories.find(c => c.idCategorie === categorieId);
  return categorie ? categorie.nomCategorie : '';
}
}