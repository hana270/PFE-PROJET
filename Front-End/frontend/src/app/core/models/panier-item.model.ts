import { Bassin } from "./bassin.models";
import { Accessoire } from "./accessoire.models";

export interface CustomProperties {
  dimensions?: string;
  couleur?: string;
  materiau?: string;
  accessoires?: Accessoire[];
  prixEstime?: number;
  dureeFabrication?: string;
  imageUrl?: string;
  isCustomized?: boolean;
  materiauSelectionne?: string;
  dimensionSelectionnee?: string;
  couleurSelectionnee?: string;
}

export interface PanierItem {
  id: number;
  quantity: number;
  bassin?: Bassin;
  bassinId?: number;
  nomBassin?: string;
  
  // Customization fields
  couleurSelectionnee?: string;
  materiauSelectionne?: string;
  dimensionSelectionnee?: string;
  
  // Product details
  dimensions?: string | string[];
  couleur?: string;
  materiau?: string | string[];
  imageStr?: string;
  imageUrl?: string;
  
  // Pricing
  prixOriginal?: number;
  prixPromo?: number;
  prix?: number;
  customPrice?: number;
  effectivePrice: number;
  subtotal?: number;
  
  // Promotion
  promotionActive?: boolean;
  nomPromotion?: string;
  tauxReduction?: number;
  
  // Accessories
  accessoires?: Accessoire[];
  
  // Customization
  isCustomized?: boolean;
  customProperties?: CustomProperties;
}

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
  customProperties?: CustomProperties;
}