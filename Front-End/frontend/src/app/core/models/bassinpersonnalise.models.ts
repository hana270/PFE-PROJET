import { Accessoire } from "./accessoire.models";
import { Bassin } from "./bassin.models";

export class BassinPersonnalise {
    idBassinPersonnalise!: number;
    idBassin!: number;
    bassin?: Bassin;
    description?: string;
    materiaux!: string[];
    dimensions!: string[];
    accessoires!: Accessoire[];
    dureeFabrication?: number;
    prixEstime?: number;
    couleur?: string;
    imageUrl?: string;
    isCustomized: boolean = true;

    // Propriétés pour la personnalisation
    materiauSelectionne?: string;
    dimensionSelectionnee?: string;
    couleurSelectionnee?: string;

    // Propriétés calculées
    get nomBassin(): string {
        return this.bassin?.nomBassin ? `${this.bassin.nomBassin} Personnalisé` : 'Bassin Personnalisé';
    }

    get prix(): number {
        return this.prixEstime || this.bassin?.prix || 0;
    }

    get imagesBassin(): string[] {
        return this.bassin?.imagesBassin?.map(img => img.imagePath) || [];
    }

    get firstImageUrl(): string {
        return this.imagesBassin[0] || 'assets/default-bassin.webp';
    }
}