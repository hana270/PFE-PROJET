import { Bassin } from "./bassin.models";
import { Accessoire } from "./accessoire.models"; 

export interface PanierItemRequest {
  bassinId?: number;
  bassinPersonnaliseId?: number;
  quantity: number;
  promotionId?: number;
  nomPromotion?: string;
  prixOriginal?: number;
  tauxReduction?: number;

  userId?: number | null;
  userEmail?: string | null;
  sessionId?: string | undefined; 
  
  isCustomized?: boolean;
  customProperties?: {
    dimensions?: string;
    couleur?: string;
    materiau?: string;
    accessoires?: any[];
    prixEstime?: number;
    dureeFabrication?: string;
    imageUrl?: string; // Add this line
  };
}

export interface PanierItem {
  id: number;
  quantity: number;
  bassin?: Bassin;
  bassinId?: number; 
  nomBassin?: string;
  
  // Add these properties to match the Java entity
  couleurSelectionnee?: string;
  materiauSelectionne?: string;
  dimensionSelectionnee?: string;
  
  // Keep existing properties
  dimensions?: string | string[];
  couleur?: string;
  materiau?: string | string[];
  imageStr?: string;
  imageUrl?: string;
  prixOriginal?: number;
  prixPromo?: number;
  promotionActive?: boolean;
  nomPromotion?: string;
  tauxReduction?: number;
  effectivePrice: number;
  subtotal?: number;
  prix?: number;
  customPrice?: number;
  accessoires?: Accessoire[];
  isCustomized?: boolean;
  customProperties?: {
    accessoires?: Accessoire[];
    isCustomized?: boolean;
    materiauSelectionne?: string;
    dimensionSelectionnee?: string;
    couleurSelectionnee?: string;
    imageUrl?: string;
    dureeFabrication?: string;
    prixEstime?: number;
  };
}
