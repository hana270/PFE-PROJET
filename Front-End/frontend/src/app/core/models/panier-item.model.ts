import { Bassin } from './bassin.models';
import { Accessoire } from './accessoire.models';

export interface CustomProperties {
  nomBassin?: string;
  dimensions?: string;
  couleur?: string;
  materiau?: string;
  accessoires?: Accessoire[];
  prixEstime: number;
  dureeFabrication: string;
  dureeFabricationDisplay?: string;
  materiauPrice: number;
  dimensionPrice: number;
  accessoiresPrice: number;
  basePrice: number;
  imageUrl?: string;
  isCustomized?: boolean;
  materiauSelectionne?: string;
  dimensionSelectionnee?: string;
  couleurSelectionnee?: string;
  bassinBase?: {
      id: number;
      nom: string;
      imageUrl: string;
      prix: number;
  };
}

export interface PanierItem {
  description: string | undefined;
  id: number;
  quantity: number;
  bassin?: Bassin;
  bassinId: number;
  nomBassin?: string;

  customization?: {
    materiauSelectionne?: string;
    prixMateriau: number ;
    dimensionSelectionnee?: string;
    prixDimension: number;
    couleurSelectionnee?: string;
    prixEstime?: number;
    dureeFabrication?: string;
  };

  dimensions?: string | string[];
  couleur?: string;
  materiau?: string | string[];
  imageStr?: string;
  prixPromo?: number;
  prix?: number;
  customPrice?: number;
  subtotal?: number;
  prixUnitaire: number;
  prixOriginal: number;
  //prixMateriau: number;
 // prixDimension: number;
  prixAccessoires: number;
 // prixEstime: number;
  effectivePrice: number;
  promotionActive?: boolean;
  nomPromotion?: string;
  tauxReduction?: number;
  status: 'DISPONIBLE' | 'SUR_COMMANDE' | 'RUPTURE_STOCK';
  surCommande: boolean;
 dureeFabrication?: string;
  dureeFabricationDisplay?: string;
  accessoires?: Accessoire[];
  imageUrl?: string;
  customImageUrl?: string;
  isCustomized?: boolean;
  accessoireIds?: number[]; 
  customProperties?: CustomProperties;
  bassinBase?: {
      id: number;
      nom: string;
      imageUrl: string;
      prix: number;
  };

  orderDetails?: string; 
  
}

export interface PanierItemRequest {
  bassinId: number;
  quantity: number;
  
  // Custom properties
  materiauSelectionne?: string;
  dimensionSelectionnee?: string;
  couleurSelectionnee?: string;
  accessoireIds?: number[];
  
  // Pricing
  prixOriginal: number;
  prixMateriau: number;
  prixDimension: number;
  prixAccessoires: number;
  prixEstime: number;
  
  // Other fields
  nomBassin?: string;
  imageUrl?: string;
  dureeFabrication?: string;

  isCustomized: boolean;
  status: 'DISPONIBLE' | 'SUR_COMMANDE' | 'RUPTURE_STOCK'; // Ajout explicite
  // Promotion
  promotionId?: number;
  nomPromotion?: string;
  tauxReduction?: number;
  promotionActive?: boolean;
}