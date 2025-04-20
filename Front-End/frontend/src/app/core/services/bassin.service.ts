import { Injectable } from '@angular/core';

import { Bassin } from '../models/bassin.models';
import { Categorie } from '../models/categorie.models';
import { ImageBassin } from '../models/image.models';

import { catchError, map, Observable ,of, switchMap, throwError} from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../authentication/auth.service';
import { CategorieWrapper } from '../models/CategorieWrapper.models';
import { BassinPersonnalise } from '../models/bassinpersonnalise.models';
import { Accessoire } from '../models/accessoire.models';
import { Promotion } from '../models/promotion.model';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class BassinService {

  /** Les variables **/
  bassins: Bassin[] = [];

  categories: Categorie[] = [];

  apiURL: string = 'http://localhost:8089/aquatresor/api';
  apiURLCategorie: string = 'http://localhost:8089/aquatresor/api/categories';


  constructor(private http: HttpClient, private authService: AuthService) { }

  // Charger les images pour un bassin spécifique
  chargerImagesPourBassin(bassin: Bassin): Bassin {
    if (bassin.imagesBassin && bassin.imagesBassin.length > 0) {
      bassin.imageStr = `${this.apiURL}/imagesBassin/getFS/${bassin.imagesBassin[0].imagePath}`;
    } else {
      bassin.imageStr = 'assets/default-image.webp';
    }
    return bassin;
  }

  // consulter un bassin
  consulterBassin(id: number): Observable<Bassin> {
    const url = `${this.apiURL}/getbyid/${id}`;
    let jwt = this.authService.getToken();
    jwt = "Bearer " + jwt;
    let httpHeaders = new HttpHeaders({ "Authorization": jwt });
    return this.http.get<Bassin>(url, { headers: httpHeaders }).pipe(
      map(bassin => {
        // Si le bassin a une promotion, vérifier si elle est active
        if (bassin.promotion) {
          const now = new Date();
          const startDate = new Date(bassin.promotion.dateDebut);
          const endDate = new Date(bassin.promotion.dateFin);
          
          bassin.promotionActive = now >= startDate && now <= endDate;
          if (bassin.promotionActive) {
            bassin.prixPromo = bassin.prix * (1 - (bassin.promotion.tauxReduction / 100));
          }
        }
        return bassin;
      })
    );
  }




  

  // Ajouter un bassin
  ajouterBassin(bassin: Bassin): Observable<Bassin> {
    const headers = this.getHeaders();
    return this.http.post<Bassin>(`${this.apiURL}/addbassin`, bassin, { headers });
  }

  // Ajouter un bassin
  ajouterBassinWithImg(bassinData: FormData): Observable<any> {
    return this.http.post(`${this.apiURL}/addBassinWithImages`, bassinData, {
      headers: new HttpHeaders({
        // Ne pas mettre 'Content-Type', FormData le gère automatiquement
        'Accept': 'application/json'
      })
    });
  }

  // supprimer bassin
  supprimerBassin(id: number): Observable<void> {
    const url = `${this.apiURL}/deletebassin/${id}`;
    let jwt = this.authService.getToken();
    jwt = "Bearer " + jwt;
    let httpHeaders = new HttpHeaders({ "Authorization": jwt });
    return this.http.delete<void>(url, { headers: httpHeaders });
  }

  // update un bassin
  updateBassin(b: Bassin): Observable<Bassin> {
    let jwt = this.authService.getToken();
    jwt = "Bearer " + jwt;
    let httpHeaders = new HttpHeaders({ "Authorization": jwt });
    const url = `${this.apiURL}/updatebassin/${b.idBassin}`; // Include ID if needed
    return this.http.put<Bassin>(url, b, { headers: httpHeaders });
  }

  updateBassinWithImg(bassin: Bassin, files: File[]): Observable<Bassin> {
    const formData = new FormData();
    formData.append('bassin', JSON.stringify(bassin));

    files.forEach((file, index) => {
      if (file) {
        formData.append(`files`, file);
      }
    });

    return this.http.post<Bassin>(`${this.apiURL}/updateBassinWithImg`, formData);
  }

  /** Image **/
  uploadImage(file: File, filename: string): Observable<ImageBassin> {
    const imageFormData = new FormData();
    imageFormData.append('image', file, filename);
    const url = `${this.apiURL + '/image/upload'}`;
    return this.http.post<ImageBassin>(url, imageFormData);
  }

  loadImage(id: number): Observable<ImageBassin> {
    const url = `${this.apiURL + '/image/get/info'}/${id}`;
    return this.http.get<ImageBassin>(url);
  }

  uploadImageBassin(file: File, filename: string, idBassin: number): Observable<any> {
    const imageFormData = new FormData();
    imageFormData.append('image', file, filename);
    const url = `${this.apiURL + '/image/uploadImageB'}/${idBassin}`;

    return this.http.post(url, imageFormData);
  }

  /******Les lignes de codes pour stocker une images dans le file *******/
  uploadImageFS(file: File, idBassin: number): Observable<any> {
    console.log(`📤 Upload de l'image:`, file.name, ` pour bassin ID: ${idBassin}`);
    const imageFormData = new FormData();

    // Générer le nom de fichier selon la logique idBassin_idImage.extension
    //const originalFileName = file.name;
    //const extension = originalFileName.split('.').pop(); // Récupérer l'extension du fichier
    //const fileName = `${idBassin}_${imageNumber}.${extension}`;

    // Ajouter le fichier avec le nom correct
    //imageFormData.append('image', file, fileName);
    imageFormData.append('image', file);

    //console.log(`Uploading file: ${fileName} for bassin ID: ${idBassin}`); // Log pour vérifier le nom du fichier

    const url = `${this.apiURL}/imagesBassin/uploadFS/${idBassin}`;
    console.log(`URL:`, url);
    return this.http.post(url, imageFormData);
  }

  supprimerImage(id: number): Observable<void> {
    const url = `${this.apiURL}/imagesBassin/delete/${id}`;
    let jwt = this.authService.getToken();
    jwt = "Bearer " + jwt;
    let httpHeaders = new HttpHeaders({ "Authorization": jwt });
    return this.http.delete<void>(url, { headers: httpHeaders });
  }

  // Obtenir la liste des catégories
  listeCategories(): Observable<Categorie[]> {
    const headers = this.getHeaders();
    return this.http.get<Categorie[]>(`${this.apiURL}/categories`, { headers });
  }

  // Méthode pour générer les en-têtes avec le token JWT
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  //Bassin Personnalisé
  // Ajoutez cette méthode pour ajouter un bassin personnalisé
  ajouterBassinPersonnalise(formData: FormData, idBassin: number): Observable<BassinPersonnalise> {
    const headers = this.getHeaders();
    return this.http.post<BassinPersonnalise>(`${this.apiURL}/bassinpersonnalise/ajouterBassinPersonnalise/${idBassin}`,
      formData
    );
  }

  // Fonction pour extraire le nom du fichier à partir du chemin complet
  private getFileNameFromPath(filePath: string): string {
    // Utiliser une expression régulière pour extraire le nom du fichier
    const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || filePath;
    console.log("nom de file est: ", fileName)
    return fileName;
  }

  // consulter un bassin Personnalise
  consulterBassinPersonnalise(id: number): Observable<BassinPersonnalise> {
    return this.http.get<BassinPersonnalise>(`${this.apiURL}/bassinpersonnalise/detailBassinPersonnalise/${id}`)
      .pipe(
        map(bassinPersonnalise => {
          // Construire l'URL complète pour chaque accessoire
          bassinPersonnalise.accessoires = bassinPersonnalise.accessoires.map(accessoire => {
            const fileName = this.getFileNameFromPath(accessoire.imagePath); // Extraire le nom du fichier
            accessoire.imageUrl = `${this.apiURL}/imagespersonnalise/${fileName}`; // Construire l'URL complète
            return accessoire;
          });
          return bassinPersonnalise;
        })
      );
  }

// Dans bassin.service.ts
getBaseImageUrl(): string {
  return 'http://localhost:8089/aquatresor/api/imagespersonnalise';
}

  supprimerBassinPersonnalise(idBassinPersonnalise: number): Observable<BassinPersonnalise> {
    const headers = this.getHeaders();
    return this.http.delete<BassinPersonnalise>(`${this.apiURL}/bassinpersonnalise/supprimerBassinPersonnalise/${idBassinPersonnalise}`);
  }

  //Récupère l'id de bassin personnalise en entrant dans l'url l'id de bassin
  getBassinPersonnaliseByBassinId(idBassin: number): Observable<any> {
    return this.http.get<any>(`${this.apiURL}/bassinpersonnalise/getBassinPersonnaliseByBassin/${idBassin}`);
  }

  // Mettre à jour un bassin personnalisé
  mettreAJourBassinPersonnalise(idBassinPersonnalise: number, formData: FormData): Observable<BassinPersonnalise> {
    console.log("Après mise à jour de l'ID :", idBassinPersonnalise); // Correct placement

    return this.http.put<BassinPersonnalise>(
      `${this.apiURL}/bassinpersonnalise/mettreAJourBassinPersonnalise/${idBassinPersonnalise}`,
      formData
    );
  }

  getAccessoireImages(idBassinPersonnalise: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiURL}/bassinpersonnalise/${idBassinPersonnalise}/accessoires/images`);
  }

/******************
 * 
 * 
 * 
 */
  //Hana Modifier cette methode
  getBassinPersonnaliseOptions(idBassin: number): Observable<{
    materiaux: string[],
    dimensions: string[],
    accessoires: any[]
  }> {
    const url = `${this.apiURL}/bassinpersonnalise/options/${idBassin}`;
    const headers = this.getHeaders();
    
    return this.http.get<{
      materiaux: string[],
      dimensions: string[],
      accessoires: any[]
    }>(url, { headers }).pipe(
      map(options => {
        // Générer l'URL complète pour chaque accessoire
        options.accessoires = options.accessoires.map(accessoire => {
          const fileName = this.getFileNameFromPath(accessoire.imagePath);
          accessoire.imageUrl = `${this.apiURL}/imagespersonnalise/${fileName}`;
          return accessoire;
        });
        return options;
      }),
      catchError(error => {
        console.error('Error loading customization options', error);
        // Retourner des valeurs par défaut en cas d'erreur
        return of({
          materiaux: [],
          dimensions: [],
          accessoires: []
        });
      })
    );
  }

//////////////////////////////
  //Promotion
  getBassinsWithPromotions(): Observable<Bassin[]> {
    return this.http.get<Bassin[]>(`${this.apiURL}/bassins?includePromotions=true`).pipe(
      map(bassins => {
        return bassins.map(bassin => {
          // Si le bassin a une promotion active, calculer le prix promo
          if (bassin.promotion && this.estPromotionActive(bassin.promotion)) {
            bassin.promotionActive = true;
            bassin.prixPromo = this.calculerPrixAvecPromotion(bassin);
          } else {
            bassin.promotionActive = false;
            bassin.prixPromo = bassin.prix; // Pas de promotion, le prix promo est le prix normal
          }
          return bassin;
        });
      })
    );
  }

  

  // Méthode pour calculer le prix avec promotion
  calculerPrixAvecPromotion(bassin: Bassin): number {
    if (bassin.promotion && bassin.promotionActive) {
      return bassin.prix * (1 - bassin.promotion.tauxReduction);
    }
    return bassin.prix;
  }

  // Vérifier si une promotion est active
  estPromotionActive(promotion: Promotion | undefined): boolean {
    if (!promotion) return false;

    // Si le statut est déjà défini, on l'utilise
    if (promotion.status === 'ACTIVE') return true;

    // Sinon on vérifie les dates
    const maintenant = new Date();
    const debut = new Date(promotion.dateDebut);
    const fin = new Date(promotion.dateFin);

    return maintenant >= debut && maintenant <= fin;
  }

  // Récupérer les notifications
getNotifications(): Observable<any[]> {
  const headers = new HttpHeaders({
    Authorization: `Bearer ${this.authService.getToken()}`
  });
  return this.http.get<any[]>(`${this.apiURL}/notifications`, { headers: headers });
}

mettreAJourQuantite(id: number, quantite: number, raison: string): Observable<any> {
  return this.http.post(`${this.apiURL}/${id}/mettre-a-jour-quantite`, null, {
    params: {
      quantite: quantite.toString(),
      raison: raison
    }
  }).pipe(
    catchError(error => {
      if (error.error instanceof ErrorEvent) {
        // Erreur côté client
        return throwError('Une erreur est survenue lors de la mise à jour du stock');
      } else {
        // Erreur côté serveur
        return throwError(error.error.message || 'Erreur lors de la mise à jour du stock');
      }
    })
  );
}


// Dans bassin.service.ts
syncBassinStatus(bassin: Bassin): Bassin {
  // Synchronisation forcée statut/stock
  if (bassin.stock === 0) {
      bassin.statut = 'SUR_COMMANDE';
  } else {
      bassin.statut = 'DISPONIBLE';
  }
  return bassin;
}

// Modifier les méthodes existantes pour utiliser cette synchro
listeBassin(): Observable<Bassin[]> {
const headers = this.getHeaders();
return this.http.get<Bassin[]>(this.apiURL + "/all", { headers }).pipe(
  map(bassins => bassins.map(bassin => this.syncBassinStatus(bassin)))
);
}

getBassinsNonArchives(): Observable<Bassin[]> {
return this.http.get<Bassin[]>(`${this.apiURL}/non-archives`).pipe(
  map(bassins => bassins.map(bassin => this.syncBassinStatus(bassin)))
);
}

getBassinsArchives(): Observable<Bassin[]> {
return this.http.get<Bassin[]>(`${this.apiURL}/archives`).pipe(
  map(bassins => bassins.map(bassin => this.syncBassinStatus(bassin)))
);
}

archiverBassin(id: number): Observable<Bassin> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.authService.getToken()}`
  });
  
  return this.http.get<Bassin>(`${this.apiURL}/getbyid/${id}`, { headers }).pipe(
    switchMap(bassin => {
      // Vérifier si le stock est à 0
      if (bassin.stock !== 0) {
        return throwError(() => new Error('Le stock doit être à 0 pour archiver un bassin'));
      }
      // Procéder à l'archivage si le stock est à 0
      return this.http.post<Bassin>(`${this.apiURL}/${id}/archiver`, {}, { headers });
    })
  );
}

// Ajouter une méthode pour mettre à jour le statut d'un bassin
updateBassinStatus(id: number, newStatus: string): Observable<Bassin> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.authService.getToken()}`
  });
  
  return this.http.post<Bassin>(
    `${this.apiURL}/${id}/update-status`, 
    { statut: newStatus }, 
    { headers }
  );
}

canArchiveBassin(bassin: Bassin): boolean {
  return bassin.stock === 0;
}

/**
Fin
*/

desarchiverBassin(id: number, nouvelleQuantite: number): Observable<Bassin> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.authService.getToken()}`
  });
  
  let params = new HttpParams()
    .set('nouvelleQuantite', nouvelleQuantite.toString());
  
  return this.http.post<Bassin>(
    `${this.apiURL}/${id}/desarchiver`, 
    null, 
    { headers: headers, params: params }
  );
}

generateStockReport(): Observable<Blob> {
  return this.http.get(`${this.apiURL}/export-rapport`, {
    responseType: 'blob'
  });
}

  ////////////////
  // Obtenir toutes les catégories
getAllCategories(): Observable<any[]> {
  const headers = new HttpHeaders({
    Authorization: `Bearer ${this.authService.getToken()}`,
  });
  return this.http.get<any[]>(`${this.apiURL}/categories`, { headers: headers });
}

getAllBassins(): Observable<Bassin[]> {
  const headers = new HttpHeaders({
    Authorization: `Bearer ${this.authService.getToken()}`,
  });
  return this.http.get<Bassin[]>(`${this.apiURL}/all`, { headers: headers });
}

//liste bassin pour client
// Liste des bassins avec gestion des promotions
listeBassinClient(): Observable<Bassin[]> {
  const headers = new HttpHeaders({
    Authorization: `Bearer ${this.authService.getToken()}`,
  });
  return this.http.get<Bassin[]>(`${this.apiURL}/all`, { headers: headers }).pipe(
    map(bassins => {
      return bassins.map(bassin => {
        // Vérifier si la promotion est active
        if (bassin.promotion) {
          bassin.promotionActive = this.estPromotionActive(bassin.promotion);
          if (bassin.promotionActive) {
            bassin.prixPromo = this.calculerPrixAvecPromotion(bassin);
          }
        }
        return this.chargerImagesPourBassin(bassin);
      });
    })
  );
}

// Liste des bassins avec leurs promotions actives
listeBassinsAvecPromotions(): Observable<Bassin[]> {
  return this.http.get<any[]>(`${this.apiURL}/promotions/bassins?includePromotions=true`, {
    headers: {
      Authorization: `Bearer ${this.authService.getToken()}`,
    }
  }).pipe(
    map(data => {
      const now = new Date(); // Ajout de la date actuelle pour vérification
      
      return data.map(item => {
        const bassin = new Bassin();
        bassin.idBassin = item.idBassin;
        bassin.nomBassin = item.nomBassin;
        bassin.description = item.description;
        bassin.prix = item.prix;
        bassin.materiau = item.materiau;
        bassin.couleur = item.couleur;
        bassin.dimensions = item.dimensions;
        bassin.disponible = item.disponible;
        bassin.stock = item.stock;
        bassin.archive = item.archive;
        bassin.categorie = item.categorie;
        bassin.imagesBassin = item.imagesBassin;
        
        // Gérer les promotions
        if (item.activePromotion) {
          bassin.promotion = new Promotion({
            idPromotion: item.activePromotion.idPromotion,
            nomPromotion: item.activePromotion.nomPromotion,
            tauxReduction: item.activePromotion.tauxReduction,
            dateDebut: item.activePromotion.dateDebut,
            dateFin: item.activePromotion.dateFin,
            status: 'ACTIVE'
          });

          // Vérifier si la promotion est active en fonction des dates
          const startDate = new Date(item.activePromotion.dateDebut);
          const endDate = new Date(item.activePromotion.dateFin);
          bassin.promotionActive = now >= startDate && now <= endDate;

          // Calculer le prix promo si la promotion est active
          if (bassin.promotionActive) {
            bassin.prixPromo = bassin.prix * (1 - (item.activePromotion.tauxReduction / 100));
          }
        } else {
          bassin.promotionActive = false;
        }
        
        return this.chargerImagesPourBassin(bassin);
      });
    })
  );
}

mettreSurCommande(id: number, dureeJours: number): Observable<Bassin> {
  const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
  });
  
  return this.http.post<Bassin>(
      `${this.apiURL}/${id}/mettre-sur-commande`, 
      null,
      { 
          headers: headers,
          params: new HttpParams().set('dureeFabricationJours', dureeJours.toString())
      }
  );
}

updateDureeFabrication(id: number, duree: number): Observable<Bassin>;
updateDureeFabrication(id: number, dureeMin: number, dureeMax: number): Observable<Bassin>;
updateDureeFabrication(id: number, dureeOrMin: number, dureeMax?: number): Observable<Bassin> {
    let params = new HttpParams();
    
    if (dureeMax !== undefined) {
        params = params.set('dureeMin', dureeOrMin.toString())
                       .set('dureeMax', dureeMax.toString());
    } else {
        params = params.set('duree', dureeOrMin.toString());
    }
    
    return this.http.put<Bassin>(`${this.apiURL}/${id}/duree-fabrication`, null, { params });
}
}
