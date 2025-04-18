import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Promotion } from '../models/promotion.model';
import { Bassin } from '../models/bassin.models';
import { AuthService } from '../authentication/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private apiURL = 'http://localhost:8089/aquatresor/api/promotions';
  
  constructor(private http: HttpClient, private authService: AuthService) { }
  
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
  
  getAllPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiURL}/all`, { headers: this.getHeaders() });
  }
  
  getPromotionById(id: number): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.apiURL}/${id}`, { headers: this.getHeaders() });
  }
  
  createPromotion(promotion: any): Observable<any> {
    console.log('Envoi de la promotion:', promotion); // Log avant envoi
    return this.http.post<any>(`${this.apiURL}/add`, promotion).pipe(
      tap((response: any) => console.log('Réponse de création de promotion:', response)) // Log après création
    );
  }
  
  updatePromotion(id: number, promotion: Promotion): Observable<Promotion> {
    return this.http.put<Promotion>(`${this.apiURL}/update/${id}`, promotion, { headers: this.getHeaders() });
  }
  
  deletePromotion(id: number): Observable<any> {
    return this.http.delete(`${this.apiURL}/delete/${id}`, { headers: this.getHeaders() });
  }
  
  applyPromotionToBassins(promotionId: number, bassinIds: number[]): Observable<Promotion> {
    return this.http.post<Promotion>(`${this.apiURL}/applyToBassins/${promotionId}`, bassinIds, { headers: this.getHeaders() });
  }
  
  applyPromotionToCategorie(promotionId: number, categorieId: number): Observable<Promotion> {
    return this.http.post<Promotion>(`${this.apiURL}/applyToCategorie/${promotionId}/${categorieId}`, {}, { headers: this.getHeaders() });
  }
 
  checkOverlappingPromotions(data: {bassins: number[], categories: number[], dateDebut: string, dateFin: string, promotionId?: number}): Observable<any> {
    return this.http.post<any>(`${this.apiURL}/check-overlaps`, data, { headers: this.getHeaders() });
  }

  getBassinsWithPromotions(): Observable<Bassin[]> {
    return this.http.get<Bassin[]>(`${this.apiURL}/bassins?includePromotions=true`, { headers: this.getHeaders() });
  }

  archivePromotion(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiURL}/archive/${id}`, {}, { headers: this.getHeaders() });
  }


  // Nouvelle méthode pour vérifier les promotions actives pour un bassin
  getActivePromotionForBassin(bassinId: number): Observable<Promotion | null> {
    return this.http.get<Promotion | null>(
      `${this.apiURL}/active-for-bassin/${bassinId}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(promo => {
        if (promo) {
          console.log('Promotion active trouvée:', promo);
        } else {
          console.log('Aucune promotion active trouvée pour ce bassin');
        }
      })
    );
  }

  // Méthode pour vérifier si une date est dans une promotion
  isDateInPromotion(promotion: Promotion, date: Date = new Date()): boolean {
    if (!promotion) return false;
    
    try {
      const startDate = new Date(promotion.dateDebut);
      const endDate = new Date(promotion.dateFin);
      
      return date >= startDate && date <= endDate;
    } catch (e) {
      console.error('Erreur de validation des dates de promotion:', e);
      return false;
    }
  }
}