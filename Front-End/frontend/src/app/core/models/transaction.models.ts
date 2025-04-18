import { Bassin } from "./bassin.models";
import { User } from "./user.model";

export class Transaction {
    idTransaction!: number;
    bassin!: Bassin;
    quantite!: number;
    typeOperation!: string;
    raison!: string;
    date!: Date;
    user!: User;
  }