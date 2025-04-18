import { Promotion } from "./promotion.model";

export interface BassinPromotion {
    promotion?: Promotion;
    promotionActive: boolean;
    prixPromo?: number;
}