import { PanierItem } from './panier-item.model';

export interface Panier {
  id: number;
  userId?: number | null;
  sessionId?: string | null;
  items: PanierItem[];
  totalPrice: number;
  lastUpdated?: Date;
}

// Export the PanierItem type if needed elsewhere
export type { PanierItem };