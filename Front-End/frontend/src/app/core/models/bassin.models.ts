import { BassinBase } from './bassin-base.model';
import { BassinMetadata } from './bassin-metadata.model';
import { BassinPromotion } from './bassin-promotion.model';
import { Categorie } from './categorie.models';
import { ImageBassin } from './image.models';

import { Promotion } from './promotion.model';

export class Bassin implements BassinBase, BassinMetadata, BassinPromotion {
    // BassinBase
    idBassin!: number;
    nomBassin!: string;
    description!: string;
    prix!: number;
    materiau!: string;
    couleur!: string;
    dimensions!: string;
    disponible!: boolean;
    stock!: number;
    categorie!: Categorie;
    image3DPath!: string;

    // BassinMetadata
    archive!: boolean;
    quantity!: number;
    isFavorite?: boolean;
    dateAjout?: Date;
    dateDerniereModification?: Date;

    promotion?: Promotion;
    promotionActive: boolean = false;
    prixPromo?: number;

    // BassinImages
    image!: ImageBassin;
    imageStr!: string;
    imagesBassin!: ImageBassin[];

    statut: string = 'DISPONIBLE';

    surCommande: boolean = false;
 // Propriétés pour la durée de fabrication
 dureeFabrication?: number;
    dureeFabricationMin?: number = 3; // Valeur par défaut min
    dureeFabricationMax?: number = 15; // Valeur par défaut max

    get dureeFabricationDisplay(): string {
        if (this.dureeFabrication) {
            return `${this.dureeFabrication} jours`;
        } else if (this.dureeFabricationMin && this.dureeFabricationMax) {
            if (this.dureeFabricationMin === this.dureeFabricationMax) {
                return `${this.dureeFabricationMin} jours`;
            } else {
                return `Entre ${this.dureeFabricationMin} et ${this.dureeFabricationMax} jours`;
            }
        }
        return 'Entre 3 et 15 jours (par défaut)';
    }

    getFirstImageUrl(): string {
        return this.imagesBassin?.[0]?.imagePath || 'assets/default-image.webp';
    }

    createCustomized(customProps: Partial<Bassin>): Bassin {
        return Object.assign(
            Object.create(Object.getPrototypeOf(this)),
            this,
            customProps
        );
    }
     
    options: any = {};
    noteMoyenne: number = 0;
    imagePath: string = '';
   enPromotion: boolean = false;

  

get isInPromotion(): boolean {
    if (!this.promotion) return false;
    
    const now = new Date();
    const startDate = new Date(this.promotion.dateDebut);
    const endDate = new Date(this.promotion.dateFin);
    
    return now >= startDate && now <= endDate;
}

get currentPrice(): number {
    return this.isInPromotion 
        ? this.prix * (1 - (this.promotion?.tauxReduction || 0) / 100)
        : this.prix;
}

get promotionPercentage(): number {
    return this.isInPromotion 
        ? (this.promotion?.tauxReduction || 0) 
        : 0;
}

get promotionName(): string {
    return this.isInPromotion 
        ? this.promotion?.nomPromotion || ''
        : '';
}

 get activePromotion(): Promotion {
    if (!this.promotionActive || !this.promotion) {
        throw new Error('Promotion is not active or undefined');
    }
    return this.promotion;
}
updatePromotionStatus(): void {
    if (!this.promotion) {
        this.promotionActive = false;
        this.prixPromo = this.prix;
        return;
    }

    try {
        const now = new Date();
        const startDate = new Date(this.promotion.dateDebut);
        const endDate = new Date(this.promotion.dateFin);
        
        this.promotionActive = now >= startDate && now <= endDate;
        
        if (this.promotionActive) {
            this.prixPromo = this.prix * (1 - (this.promotion.tauxReduction / 100));
        } else {
            this.prixPromo = this.prix;
        }
    } catch (e) {
        console.error('Erreur lors de la mise à jour de la promotion:', e);
        this.promotionActive = false;
        this.prixPromo = this.prix;
    }
}

// Méthode pour forcer la vérification de la promotion
checkPromotionValidity(): void {
    if (this.promotion) {
        const now = new Date();
        const endDate = new Date(this.promotion.dateFin);
        
        if (now > endDate) {
            this.promotionActive = false;
            this.prixPromo = this.prix;
        }
    }
}


// In your Bassin model
getPromotionForCart(): Promotion | undefined {
    if (!this.promotionActive || !this.promotion) return undefined;
    
    const now = new Date();
    const startDate = new Date(this.promotion.dateDebut);
    const endDate = new Date(this.promotion.dateFin);
    
    if (now >= startDate && now <= endDate) {
      return this.promotion;
    }
    return undefined;
  }
  
  getCurrentPrice(): number {
    if (this.promotionActive && this.promotion) {
      const now = new Date();
      const startDate = new Date(this.promotion.dateDebut);
      const endDate = new Date(this.promotion.dateFin);
      
      if (now >= startDate && now <= endDate) {
        return this.prix * (1 - this.promotion.tauxReduction / 100);
      }
    }
    return this.prix;
  }
/*************** */
 
}