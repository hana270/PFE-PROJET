// services/avis.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, Observable } from 'rxjs';
import { Avis } from '../models/avis.models';
import { AuthService } from '../authentication/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AvisService {
  private apiUrl = 'http://localhost:8089/aquatresor/api/avis';

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

 // Dans avis.service.ts
getAvisByBassin(idBassin: number): Observable<Avis[]> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.authService.getToken()}`
  });
  return this.http.get<Avis[]>(`${this.apiUrl}/bassin/${idBassin}`, { headers });
}

  addAvis(avis: Avis, idBassin: number): Observable<Avis> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
    
    // Ensure dates are properly formatted
    const avisToSend = {
      ...avis,
      dateSoumission: new Date().toISOString(),
      dateModification: null
    };
    
    return this.http.post<Avis>(
      `${this.apiUrl}/add/${idBassin}`, 
      avisToSend, 
      { headers }
    );
  }

  updateAvis(idAvis: number, avis: Avis): Observable<Avis> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json'
    });
  
    return this.http.put<Avis>(
      `${this.apiUrl}/update/${idAvis}`, 
      avis, 
      { headers }
    ).pipe(
      catchError(error => {
        console.error('Update avis error:', error);
        throw error; // Laissez le composant gérer l'erreur
      })
    );
  }
  

  deleteAvis(id: number): Observable<any> {
    const headers = new HttpHeaders({
        'Authorization': `Bearer ${this.authService.getToken()}`,
        'Content-Type': 'application/json'
    });

    return this.http.delete(`${this.apiUrl}/delete/${id}`, { headers }).pipe(
        catchError(error => {
            console.error('Delete avis error:', error);
            throw error;
        })
    );
}

  getAllAvis(): Observable<Avis[]> {
    return this.http.get<Avis[]>(`${this.apiUrl}/all`);
  }
}