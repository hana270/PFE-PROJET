export interface HistoriqueModification {
  dateModification: string;
  ancienneNote: number;
  ancienMessage: string;
  ancienNom: string;
}

export interface Avis {
  idAvis: number;
  nom: string;
  message: string;
  note: number;
  bassin?: any;
  userId?: number | null;
  dateSoumission: string;
  dateModification: string | null;
  historiqueModifications: HistoriqueModification[]; 
  showHistorique?: boolean;
}