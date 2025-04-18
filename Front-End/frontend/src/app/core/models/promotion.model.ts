export class Promotion {
  idPromotion?: number;
  nomPromotion!: string;
  tauxReduction!: number;
  pourcentage!: number; // Add this if you want to use "pourcentage" in the template
  isActive!: boolean; // Add this if you want to use "isActive" in the template
  dateDebut!: string;
  dateFin!: string;
  bassins?: any[];
  categories?: any[];
  status: string = '';


  constructor(data?: any) {
    if (data) {
      
      this.idPromotion = data.idPromotion;
      this.nomPromotion = data.nomPromotion;
      this.tauxReduction = data.tauxReduction;
      this.pourcentage = data.tauxReduction * 100; // Convert tauxReduction to percentage
      this.isActive = data.status === 'ACTIVE'; // Example logic for isActive
      this.dateDebut = data.dateDebut;
      this.dateFin = data.dateFin;
      this.bassins = data.bassins || [];
      this.categories = data.categories || [];
    }
  }
}