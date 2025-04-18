export interface Accessoire {
    idAccessoire: number;
    nomAccessoire: string;
    prixAccessoire: number;
    imagePath: string; // Chemin de l'image de l'accessoire
    imageUrl?: string; // URL complète de l'image (à calculer dans le service)

}