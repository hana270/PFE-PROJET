import { PanierItem } from './panier-item.model';

export interface Panier {
  id: number;
  userId?: number | null; // Changed to accept null
  sessionId?: string | null;
  items: PanierItem[];
  totalPrice: number;
}
// Réexportez explicitement PanierItem si nécessaire
export type { PanierItem } from './panier-item.model';