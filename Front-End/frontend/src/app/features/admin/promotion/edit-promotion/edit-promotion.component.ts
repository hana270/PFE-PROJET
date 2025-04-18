import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Promotion } from '../../../../core/models/promotion.model';
import { PromotionService } from '../../../../core/services/promotion.service';
import { BassinService } from '../../../../core/services/bassin.service';
import { CategorieService } from '../../../../core/services/categorie.service';
import Swal from 'sweetalert2';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-edit-promotion',
  templateUrl: './edit-promotion.component.html',
  styleUrls: ['./edit-promotion.component.scss'],
})
export class EditPromotionComponent implements OnInit {
  // Propriétés
  promotion: Promotion = new Promotion();
  promotionId!: number;
  bassins: any[] = [];
  categories: any[] = [];
  selectedBassinIds: number[] = [];
  selectedCategorieIds: number[] = [];
  bassinSearchTerm: string = '';
  categorieSearchTerm: string = '';
  dateDebutString!: string;
  dateFinString!: string;
  heureDebut: string = '00:00';
  heureFin: string = '00:00';
  overlappingBassins: Map<number, any> = new Map();
  overlappingCategories: Map<number, any> = new Map();
  showOverlappingWarning: boolean = false;
  isLoading: boolean = true;

  // Propriétés pour la validation
  dateDebutError: string = '';
  dateFinError: string = '';
  heureDebutError: string = '';
  heureFinError: string = '';
  tauxReductionError: string = '';
  reductionRateError: string = '';
  
  // Pour la pagination des bassins et catégories
  itemsPerPage: number = 12;
  currentBassinPage: number = 1;
  currentCategoriePage: number = 1;
  Math = Math;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private promotionService: PromotionService,
    private bassinService: BassinService,
    private categorieService: CategorieService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.promotionId = +this.route.snapshot.params['id'];
    // Chargeons d'abord les bassins et catégories, puis la promotion
    Promise.all([
      this.loadBassinsPromise(),
      this.loadCategoriesPromise()
    ]).then(() => {
      this.loadPromotion();
    }).catch(error => {
      console.error('Erreur lors du chargement initial', error);
      this.isLoading = false;
      this.showErrorMessage('Une erreur est survenue lors du chargement des données');
    });
  }

getTotalPages(itemsCount: number): number {
  return Math.ceil(itemsCount / this.itemsPerPage);
}

  // Promisify pour un chargement séquentiel
  loadBassinsPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bassinService.getAllBassins().subscribe({
        next: (data) => {
          this.bassins = data;
          resolve();
        },
        error: (err) => {
          console.error('Erreur lors du chargement des bassins', err);
          reject(err);
        }
      });
    });
  }

  loadCategoriesPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.categorieService.getAllCategories().subscribe({
        next: (data) => {
          this.categories = data;
          resolve();
        },
        error: (err) => {
          console.error('Erreur lors du chargement des catégories', err);
          reject(err);
        }
      });
    });
  }

  loadPromotion(): void {
    this.isLoading = true;
    this.promotionService.getPromotionById(this.promotionId).subscribe({
      next: (data) => {
        this.promotion = data;
        
        // Convertir le taux de réduction en pourcentage pour l'affichage
        if (this.promotion.tauxReduction != null) {
          this.promotion.tauxReduction = this.promotion.tauxReduction * 100;
        }
        
        // Formater les dates pour les champs de type date
        const dateDebut = new Date(this.promotion.dateDebut);
        const dateFin = new Date(this.promotion.dateFin);
        this.dateDebutString = this.formatDateForInput(dateDebut);
        this.dateFinString = this.formatDateForInput(dateFin);
        this.heureDebut = this.formatTimeForInput(dateDebut);
        this.heureFin = this.formatTimeForInput(dateFin);
        
        // Sélectionner les bassins associés à la promotion
        this.selectedBassinIds = this.promotion.bassins?.map((b) => 
          typeof b === 'object' ? b.idBassin : b) || [];
        
        // Sélectionner les catégories associées à la promotion
        this.selectedCategorieIds = this.promotion.categories?.map((c) => 
          typeof c === 'object' ? c.idCategorie : c) || [];
        
        console.log('Bassins sélectionnés:', this.selectedBassinIds);
        console.log('Catégories sélectionnées:', this.selectedCategorieIds);
        
        // Vérifier les chevauchements après le chargement
        this.checkOverlaps();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la promotion', err);
        this.isLoading = false;
        this.showErrorMessage('Une erreur est survenue lors du chargement de la promotion');
      },
    });
  }

  validateReductionRate(): void {
    const rate = this.promotion.tauxReduction;
    
    if (rate === null || rate === undefined || isNaN(Number(rate))) {
      this.reductionRateError = 'Le taux de réduction est requis.';
      return;
    }
  
    if (Number(rate) < 1 || Number(rate) > 100) {
      this.reductionRateError = 'Le taux de réduction doit être compris entre 1% et 100%.';
      return;
    }
  
    this.reductionRateError = '';
  }
  
  validateSelections(): boolean {
    // For update, at least one basin must be selected
    if (this.selectedBassinIds.length === 0) {
      this.showErrorMessage('Vous devez sélectionner au moins un bassin pour la promotion.');
      return false;
    }
    // Categories are optional but you could add validation here if needed
    return true;
  }

  onSubmit(): void {
    // Valider le taux de réduction
    this.validateReductionRate();
    if (this.reductionRateError) {
      this.showErrorMessage(this.reductionRateError);
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
    
    // Créer l'objet promotion pour la mise à jour
    const promotionToUpdate = {
      ...this.promotion,
      dateDebut: dateDebut.toISOString(),
      dateFin: dateFin.toISOString(),
      bassins: this.selectedBassinIds,
      categories: this.selectedCategorieIds,
      tauxReduction: Number(this.promotion.tauxReduction) / 100 // Convertir en décimal
    };

    console.log('Détails de la promotion à mettre à jour:', promotionToUpdate);

    // CORRECTION : Utiliser updatePromotion au lieu de createPromotion
    this.promotionService.updatePromotion(this.promotionId, promotionToUpdate).subscribe({
      next: (data) => {
        console.log('Promotion mise à jour avec succès:', data);
        this.notificationService.notifyPromotionUpdate();
        
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'La promotion a été mise à jour avec succès.',
        }).then(() => {
          this.router.navigate(['/admin/promotions']);
        });
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de la promotion', err);
        let errorMessage = 'Une erreur est survenue lors de la mise à jour de la promotion.';
        
        if (err.error && err.error.message) {
          errorMessage = err.error.message;
        } else if (err.status === 403) {
          errorMessage = "Vous n'avez pas les autorisations nécessaires.";
        } else if (err.status === 409) {
          errorMessage = "Conflit: Des chevauchements existent avec d'autres promotions.";
        }
        
        this.showErrorMessage(errorMessage);
      }
    });
  }

  showErrorMessage(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: message,
    });
  }

  formatDateForInput(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  formatTimeForInput(date: Date): string {
    if (!date) return '00:00';
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    return `${hours}:${minutes}`;
  }

  validateTauxReduction(): void {
    const rate = Number(this.promotion.tauxReduction);
    if (isNaN(rate) || rate < 1 || rate > 100) {
      this.tauxReductionError = 'Le taux de réduction doit être compris entre 1% et 100%.';
    } else {
      this.tauxReductionError = '';
    }
  }

  validateDates(): boolean {
    // Réinitialiser les erreurs
    this.dateDebutError = '';
    this.dateFinError = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dateDebut = new Date(`${this.dateDebutString}T${this.heureDebut}`);
    const dateFin = new Date(`${this.dateFinString}T${this.heureFin}`);
    
    // CORRECTION: Permettre la modification des promotions passées
    // Mais valider que la date de fin est toujours après la date de début
    if (dateFin <= dateDebut) {
      this.dateFinError = 'La date de fin doit être après la date de début.';
      this.showErrorMessage(this.dateFinError);
      return false;
    }
    
    this.validateTauxReduction();
    
    return !this.dateDebutError && !this.dateFinError && !this.tauxReductionError;
  }

  loadBassins(): void {
    this.bassinService.getAllBassins().subscribe({
      next: (data) => {
        this.bassins = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des bassins', err);
        this.showErrorMessage('Une erreur est survenue lors du chargement des bassins');
      },
    });
  }

  loadCategories(): void {
    this.categorieService.getAllCategories().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des catégories', err);
        this.showErrorMessage('Une erreur est survenue lors du chargement des catégories');
      },
    });
  }

  // Gestion des bassins
  isBassinSelected(bassinId: number): boolean {
    return this.selectedBassinIds.includes(bassinId);
  }

  toggleBassinSelection(bassinId: number): void {
    // Prevent unselecting if it's the last selected bassin
    if (this.selectedBassinIds.includes(bassinId) && this.selectedBassinIds.length === 1) {
      this.showErrorMessage('Vous devez sélectionner au moins un bassin.');
      return;
    }
  
    const index = this.selectedBassinIds.indexOf(bassinId);
    if (index === -1) {
      this.selectedBassinIds.push(bassinId);
    } else {
      this.selectedBassinIds.splice(index, 1);
    }
    this.checkOverlaps();
  }
  
  deselectAllBassins(): void {
    // Don't allow deselecting all if we're in edit mode
    this.showErrorMessage('Vous devez sélectionner au moins un bassin.');
  }

  selectAllBassins(): void {
    this.selectedBassinIds = this.filteredBassins.map(bassin => bassin.idBassin);
    this.checkOverlaps();
  }



  // Gestion des catégories
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
    console.log('Catégories sélectionnées après toggle:', this.selectedCategorieIds);
    this.checkOverlaps();
  }

  selectAllCategories(): void {
    this.selectedCategorieIds = this.filteredCategories.map(categorie => categorie.idCategorie);
    this.checkOverlaps();
  }

  deselectAllCategories(): void {
    this.selectedCategorieIds = [];
    this.checkOverlaps();
  }

  // Vérification des chevauchements
  checkOverlaps(): void {
    if (!this.dateDebutString || !this.dateFinString) {
      this.showOverlappingWarning = false;
      this.overlappingBassins = new Map();
      this.overlappingCategories = new Map();
      return;
    }

    const dateDebut = new Date(`${this.dateDebutString}T${this.heureDebut}`).toISOString();
    const dateFin = new Date(`${this.dateFinString}T${this.heureFin}`).toISOString();

    // Pour la vérification, nous considérons tous les bassins/catégories
    const checkData = {
      bassins: this.bassins.map(b => b.idBassin),
      categories: this.categories.map(c => c.idCategorie),
      dateDebut: dateDebut,
      dateFin: dateFin,
      promotionId: this.promotionId // Pour exclure la promotion actuelle
    };

    this.promotionService.checkOverlappingPromotions(checkData).subscribe({
      next: (response) => {
        // Réinitialiser les chevauchements
        this.overlappingBassins = new Map();
        this.overlappingCategories = new Map();

        // Traiter les bassins en chevauchement
        if (response.bassins && response.bassins.length > 0) {
          response.bassins.forEach((item: any) => {
            this.overlappingBassins.set(item.id, item);
          });
        }

        // Traiter les catégories en chevauchement
        if (response.categories && response.categories.length > 0) {
          response.categories.forEach((item: any) => {
            this.overlappingCategories.set(item.id, item);
          });
        }

        this.showOverlappingWarning = 
          this.overlappingBassins.size > 0 || this.overlappingCategories.size > 0;
      },
      error: (err) => {
        console.error('Erreur lors de la vérification des chevauchements', err);
        this.showErrorMessage('Une erreur est survenue lors de la vérification des disponibilités');
      }
    });
  }

  isBassinOverlapping(bassinId: number): boolean {
    return this.overlappingBassins.has(bassinId);
  }

  getBassinOverlappingInfo(bassinId: number): any {
    return this.overlappingBassins.get(bassinId);
  }

  isCategorieOverlapping(categorieId: number): boolean {
    return this.overlappingCategories.has(categorieId);
  }

  getCategorieOverlappingInfo(categorieId: number): any {
    return this.overlappingCategories.get(categorieId);
  }

  onDateChange(): void {
    this.validateDateDebut();
    this.validateDateFin();
    this.checkOverlaps();
  }

  goBack(): void {
    this.router.navigate(['/admin/promotions']);
  }

  // Pagination
  nextBassinPage(): void {
    const maxPage = Math.ceil(this.filteredBassins.length / this.itemsPerPage);
    if (this.currentBassinPage < maxPage) {
      this.currentBassinPage++;
    }
  }

  prevBassinPage(): void {
    if (this.currentBassinPage > 1) {
      this.currentBassinPage--;
    }
  }

  nextCategoriePage(): void {
    const maxPage = Math.ceil(this.filteredCategories.length / this.itemsPerPage);
    if (this.currentCategoriePage < maxPage) {
      this.currentCategoriePage++;
    }
  }

  prevCategoriePage(): void {
    if (this.currentCategoriePage > 1) {
      this.currentCategoriePage--;
    }
  }

  // Filtre et pagination
  get filteredBassins(): any[] {
    if (!this.bassinSearchTerm) {
      return this.bassins;
    }
    const searchTerm = this.bassinSearchTerm.toLowerCase();
    return this.bassins.filter(bassin => 
      bassin.nomBassin.toLowerCase().includes(searchTerm)
    );
  }
  
  get paginatedBassins(): any[] {
    const startIndex = (this.currentBassinPage - 1) * this.itemsPerPage;
    return this.filteredBassins.slice(startIndex, startIndex + this.itemsPerPage);
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
  
  get paginatedCategories(): any[] {
    const startIndex = (this.currentCategoriePage - 1) * this.itemsPerPage;
    return this.filteredCategories.slice(startIndex, startIndex + this.itemsPerPage);
  }

  validateDateDebut(): void {
    // Pour l'édition, on permet de garder la date originale même si elle est dans le passé
    this.dateDebutError = '';
    this.checkOverlaps();
  }

  validateDateFin(): void {
    const dateDebut = new Date(`${this.dateDebutString}T${this.heureDebut}`);
    const dateFin = new Date(`${this.dateFinString}T${this.heureFin}`);

    if (dateFin <= dateDebut) {
      this.dateFinError = "La date et l'heure de fin doivent être après la date et l'heure de début.";
    } else {
      this.dateFinError = '';

      // Valider la durée minimale
      const durationInHours = (dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60);
      if (durationInHours < 1) {
        this.dateFinError = 'La promotion doit durer au moins 1 heure.';
      }
    }
 this.checkOverlaps();
  }
  get bassinTotalPages(): number {
    return Math.ceil(this.filteredBassins.length / this.itemsPerPage);
  }
  get categorieTotalPages(): number {
    return Math.ceil(this.filteredCategories.length / this.itemsPerPage);
  }
}