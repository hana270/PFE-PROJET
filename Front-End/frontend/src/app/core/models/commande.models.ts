import { PanierItem } from "./panier-item.model";

export enum StatutCommande {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDEE = 'VALIDEE',
  EN_PREPARATION = 'EN_PREPARATION',
  EXPEDIEE = 'EXPEDIEE',
  LIVREE = 'LIVREE',
  ANNULEE = 'ANNULEE'
}

export enum ModeLivraison {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  POINT_RELAIS = 'POINT_RELAIS'
}

export enum ModePaiement {
  CARTE_BANCAIRE = 'CARTE_BANCAIRE',
}

export interface LigneCommande {
  id?: number;
  produitId: number;
  typeProduit: 'BASSIN_STANDARD' | 'BASSIN_PERSONNALISE';
  nomProduit: string;
  description: string;
  imageUrl: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
  materiauSelectionne?: string;
  prixMateriau?: number;
  dimensionSelectionnee?: string;
  prixDimension?: number;
  couleurSelectionnee?: string;
  statutProduit: 'DISPONIBLE' | 'SUR_COMMANDE' | 'RUPTURE_STOCK';
  delaiFabrication?: string;
  accessoires?: AccessoireCommande[];
}

export interface AccessoireCommande {
  id?: number;
  accessoireId: number;
  nomAccessoire: string;
  prixAccessoire: number;
  imageUrl: string;
}

export interface Commande {
  id?: number;
  numeroCommande: string;
  clientId: number;
  emailClient: string;
  statut: StatutCommande;
  montantTotal: number;
  montantTVA: number;
  montantTotalTTC: number;
  modeLivraison: ModeLivraison;
  modePaiement?: ModePaiement;
  paiementConfirme: boolean;
  dateCreation: Date;
  datePaiement?: Date;
  adresseLivraison: string;
  codePostal: string;
  ville: string;
  pays: string;
  lignesCommande: LigneCommande[];
}

export interface CreationCommandeRequest {
  clientId: string;
  panierId: number; 
  clientNom: string;
  clientPrenom: string;
  clientEmail: string;
  clientTelephone: string;
  adresseLivraison: string;
  codePostal: string;
  ville: string;
  region: string;
  modeLivraison: string;
  commentaires?: string;
  items: PanierItem[];
}

export interface PaiementRequest {
  commandeId: number;
  modePaiement: ModePaiement;
  tokenPaiement?: string;
  saveCard?: boolean;
}

export interface CommandeResponse {
  success: boolean;
  commande: Commande;
  redirectUrl?: string;
}