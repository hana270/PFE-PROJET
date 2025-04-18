import { Panier } from './panier.model';

export interface PanierResponse {
  panier: Panier;
  metadata?: {
    expiresAt?: string;
    warnings?: string[];
  };
}