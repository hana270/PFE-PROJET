import { Categorie } from "./categorie.models";

export class CategorieWrapper{
    //pour suivre le format qui j'ai recoive de mon sping data rest
    _embedded!: {categories: Categorie[]};
}