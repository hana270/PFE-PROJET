import { CartService } from './cart.service';
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, timeout, retry, tap } from 'rxjs/operators';

import { AuthStateService } from './auth-state.service';

import {
  Commande,
  CreationCommandeRequest,
  PaiementRequest,
  CommandeResponse,
  StatutCommande,
  ModeLivraison,
  ModePaiement,
  LigneCommande,
  AccessoireCommande,
} from '../models/commande.models';

@Injectable({
  providedIn: 'root',
})
export class CommandeService {
  // Use environment variables for API URLs
  private apiUrl = 'http://localhost:8090/orders/api/commandes';
  private panierUrl = 'http://localhost:8090/orders/api/panier';

  constructor(
    private http: HttpClient,
    private authStateService: AuthStateService,
    private cartService: CartService
  ) {}

  private getHeaders(): HttpHeaders {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const token = this.authStateService.getToken();
    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Check if the backend service is available
   * @returns Observable that resolves if backend is available
   */
  checkBackendStatus(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/health`, {
        headers: this.getHeaders(),
        responseType: 'text',
      })
      .pipe(
        timeout(5000), // Timeout after 5 seconds
        catchError(this.handleError)
      );
  }

  creerCommande(request: CreationCommandeRequest): Observable<CommandeResponse> {
    // 1. Créer une copie modifiable de la requête
    const requestBody: Partial<CreationCommandeRequest> = { ...request };
    
    // 2. Nettoyer le panierId si invalide (sans utiliser delete)
    if (requestBody.panierId !== undefined && requestBody.panierId <= 0) {
        requestBody.panierId = undefined;
    }

    // 3. Valider la requête
    this.validateRequest(requestBody);

    console.log('Creating command with request:', requestBody);

    // 4. Envoyer la requête
    return this.http.post<CommandeResponse>(this.apiUrl, requestBody, {
        headers: this.getHeaders(),
    }).pipe(
        retry(1),
        timeout(15000),
        map(response => this.mapResponse(response)),
        catchError(error => this.handleError(error))
    );
  }

  private validateRequest(request: Partial<CreationCommandeRequest>): void {
    if (!request.clientId) {
        throw new Error('Client ID is required');
    }

    if (!request.items || request.items.length === 0) {
        throw new Error('At least one item is required');
    }

    // Validation supplémentaire si nécessaire
    if (!request.adresseLivraison || !request.codePostal || !request.ville) {
        throw new Error('Delivery address is incomplete');
    }
  }

  private mapResponse(response: any): CommandeResponse {
    if (!response) {
        throw new Error('Empty response from server');
    }

    // Gestion des différents formats de réponse
    const commandeData = response.commande || response;
    
    if (!commandeData) {
        throw new Error('Invalid response format: missing command data');
    }

    return {
        success: true,
        commande: this.mapToCommande(commandeData),
        redirectUrl: response.redirectUrl
    };
  }

  private handleError(error: any): Observable<never> {
    console.error('Order service error:', error);

    let userMessage = 'An error occurred during operation';
    let technicalMessage = error.message || 'Unknown error';
    let errorCode = 'UNKNOWN_ERROR';

    if (error instanceof HttpErrorResponse) {
        if (error.status === 0) {
            userMessage = 'Network error: Could not connect to server';
            errorCode = 'NETWORK_ERROR';
        } else if (error.status === 400) {
            userMessage = error.error?.message || 'Invalid request data';
            errorCode = 'VALIDATION_ERROR';
        } else if (error.status === 404) {
            userMessage = error.error?.message || 'Resource not found';
            errorCode = 'NOT_FOUND';
        } else if (error.status === 500) {
            userMessage = 'Server error during processing';
            technicalMessage = error.error?.message || error.message;
            errorCode = 'SERVER_ERROR';
        }
    } else if (error.name === 'TimeoutError') {
        userMessage = 'Request timeout. Please try again.';
        errorCode = 'TIMEOUT_ERROR';
    }

    return throwError(() => ({
        userMessage,
        technicalMessage,
        errorCode,
        status: error.status,
        originalError: error
    }));
  }

  private mapToCommande(data: any): Commande {
    return {
      id: data.id,
      numeroCommande: data.numeroCommande,
      clientId: data.clientId,
      emailClient: data.emailClient,
      statut: data.statut as StatutCommande,
      montantTotal: data.montantTotal,
      montantTVA: data.montantTVA,
      montantTotalTTC: data.montantTotalTTC,
      modeLivraison: data.modeLivraison as ModeLivraison,
      modePaiement: data.modePaiement as ModePaiement,
      paiementConfirme: data.paiementConfirme,
      dateCreation: new Date(data.dateCreation),
      datePaiement: data.datePaiement ? new Date(data.datePaiement) : undefined,
      adresseLivraison: data.adresseLivraison,
      codePostal: data.codePostal,
      ville: data.ville,
      pays: data.pays,
      lignesCommande: data.lignesCommande ? data.lignesCommande.map((ligne: any) =>
        this.mapToLigneCommande(ligne)
      ) : [],
    };
  }

  private mapToLigneCommande(data: any): LigneCommande {
    return {
      id: data.id,
      produitId: data.produitId,
      typeProduit: data.typeProduit,
      nomProduit: data.nomProduit,
      description: data.description,
      imageUrl: data.imageUrl,
      quantite: data.quantite,
      prixUnitaire: data.prixUnitaire,
      prixTotal: data.prixTotal,
      materiauSelectionne: data.materiauSelectionne,
      prixMateriau: data.prixMateriau,
      dimensionSelectionnee: data.dimensionSelectionnee,
      prixDimension: data.prixDimension,
      couleurSelectionnee: data.couleurSelectionnee,
      statutProduit: data.statutProduit,
      delaiFabrication: data.delaiFabrication,
      accessoires: data.accessoires?.map((acc: any) =>
        this.mapToAccessoireCommande(acc)
      ),
    };
  }

  private mapToAccessoireCommande(data: any): AccessoireCommande {
    return {
      id: data.id,
      accessoireId: data.accessoireId,
      nomAccessoire: data.nomAccessoire,
      prixAccessoire: data.prixAccessoire,
      imageUrl: data.imageUrl,
    };
  }

  private createEmptyCommande(numero: string): Commande {
    return {
        id: 0,
        numeroCommande: numero,
        clientId: 0,
        emailClient: '',
        statut: StatutCommande.VALIDEE,
        montantTotal: 0,
        montantTVA: 0,
        montantTotalTTC: 0,
        modeLivraison: ModeLivraison.STANDARD,
        modePaiement: ModePaiement.CARTE_BANCAIRE,
        paiementConfirme: true,
        dateCreation: new Date(),
        datePaiement: new Date(),
        adresseLivraison: '',
        codePostal: '',
        ville: '',
        pays: '',
        lignesCommande: []
    };
  }

  /**
   * Get all orders for a client
   * @param clientId The client ID
   * @returns Observable with list of orders
   */
  getCommandesClient(clientId: number): Observable<Commande[]> {
    return this.http
      .get<Commande[]>(`${this.apiUrl}/client/${clientId}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Erreur récupération commandes client:', error);
          return throwError(
            () => new Error('Erreur lors de la récupération des commandes')
          );
        })
      );
  }

  traiterPaiement(request: PaiementRequest): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/paiement`, request, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Erreur traitement paiement:', error);
          return throwError(
            () => new Error('Erreur lors du traitement du paiement')
          );
        })
      );
  }

  annulerCommande(numeroCommande: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${numeroCommande}/annuler`, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Erreur annulation commande:', error);
          return throwError(
            () => new Error("Erreur lors de l'annulation de la commande")
          );
        })
      );
  }

  createPanier(panierData: any): Observable<any> {
    return this.http
      .post<any>(this.panierUrl, panierData, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }
  
  /**
   * Get order details by order number string (not ID)
   * @param numeroCommande The order number (ex: CMD-20250505-ABCDE)
   * @returns Observable with order details
   */
  getCommande(identifier: string | number): Observable<Commande> {
    console.log(`Fetching order details for: ${identifier}`);
    
    // Determine if the identifier is numeric (ID) or string (order number)
    const isNumericId = !isNaN(Number(identifier)) && identifier.toString().indexOf('-') === -1;
    
    const endpoint = isNumericId 
      ? `${this.apiUrl}/by-id/${identifier}`
      : `${this.apiUrl}/${identifier}`;
      
    return this.http.get<Commande>(endpoint, {
        headers: this.getHeaders(),
    }).pipe(
        map(response => {
            console.log('Order details retrieved successfully:', response);
            return this.mapToCommande(response);
        }),
        catchError((error: HttpErrorResponse) => {
            console.error('Order fetch error:', error);
            
            if (error.status === 404) {
                return throwError(() => ({
                  userMessage: `La commande "${identifier}" n'a pas été trouvée`,
                  technicalMessage: error.error?.message || 'Order not found',
                  errorCode: 'ORDER_NOT_FOUND',
                  status: 404,
                  originalError: error
                }));
            } else if (error.status === 0) {
                return throwError(() => new Error('Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.'));
            } else {
                const errorMsg = error.error?.message || 'Erreur lors de la récupération des détails de la commande';
                return throwError(() => new Error(errorMsg));
            }
        })
    );
  }
  
  /**
   * Update order status to VALIDEE after successful payment
   * @param commandeId The order ID or number
   * @returns Observable with updated order
   */
  updateOrderStatus(commandeId: string): Observable<Commande> {
    const updateData = {
      statut: StatutCommande.VALIDEE,
      paiementConfirme: true
    };
    
    return this.http.put<Commande>(`${this.apiUrl}/${commandeId}/statut`, updateData, {
      headers: this.getHeaders(),
    }).pipe(
      tap(updatedOrder => {
        console.log('Order status updated to VALIDEE:', updatedOrder);
      }),
      catchError(error => {
        console.error('Failed to update order status:', error);
        // Return the error but don't fail completely, as the payment itself was successful
        return throwError(() => new Error('Le paiement a été validé mais la mise à jour du statut de la commande a échoué.'));
      })
    );
  }
}