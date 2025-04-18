import { Categorie } from "./categorie.models";
import { ImageBassin } from "./image.models";

export interface BassinBase {
    idBassin: number;
    nomBassin: string;
    description: string;
    prix: number;
    materiau: string;
    couleur: string;
    dimensions: string;
    disponible: boolean;
    stock: number;
    categorie: Categorie;
    image3DPath: string;
    imageStr?: string;
    imagesBassin?: ImageBassin[];
}