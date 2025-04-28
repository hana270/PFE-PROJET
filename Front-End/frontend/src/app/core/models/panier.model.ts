import { PanierItem } from './panier-item.model';

export interface Panier {
  id: number; // ou string selon votre implémentation backend
  items: PanierItem[];
  totalPrice: number;
  userId: number | null; // Pas undefined
  sessionId: string | null; // Pas undefined
  lastUpdated?: Date; // Optionnel si nécessaire
}

// Export the PanierItem type if needed elsewhere
export type { PanierItem };