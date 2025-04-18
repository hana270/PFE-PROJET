import { Accessoire } from "./accessoire.models";
import { Bassin } from "./bassin.models";

export class BassinPersonnalise {
    idBassinPersonnalise!: number;
    idBassin!: number;
    bassin?: Bassin;
    materiaux!: string[];
    dimensions!: string[];
    accessoires!: Accessoire[];

    dureeFabrication!: number;

}