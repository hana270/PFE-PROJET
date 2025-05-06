import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiUrl = 'http://localhost:8090/orders/api/payments';

  constructor(
    private http: HttpClient,
    private authStateService: AuthStateService
  ) {}

  initiatePayment(request: PaymentRequest): Observable<PaymentResponse> {
    if ((!request.commandeId || request.commandeId === '') && 
        (!request.cartItems || request.cartItems.length === 0)) {
      return throwError(() => new Error('Either commandeId or cartItems must be provided'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authStateService.getToken()}`
    });

    return this.http.post<PaymentResponse>(`${this.apiUrl}/initiate`, request, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  verifyCode(
    request: CodeVerificationRequest
  ): Observable<PaymentValidationResponse> {
    return this.http
      .post<PaymentValidationResponse>(`${this.apiUrl}/verify`, request, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  resendVerificationCode(transactionId: string): Observable<any> {
    return this.http
      .post<any>(
        `${this.apiUrl}/resend-code`,
        { transactionId },
        {
          headers: this.getAuthHeaders(),
        }
      )
      .pipe(catchError(this.handleError));
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authStateService.getToken();
    if (!token) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
      });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.status === 400) {
        errorMessage = 'Invalid payment data';
      } else if (error.status === 401) {
        errorMessage = 'Authentication required';
      } else if (error.status === 500) {
        errorMessage = 'Server error during payment processing';
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}

export interface PaymentMethod {
  id: number;
  nom: string;
  description: string;
  imageUrl: string;
  type: string;
}

export interface PanierItemAccessoire {
  id?: number;
  accessoireId: number;
  nomAccessoire: string;
  prixAccessoire: number;
  imageUrl?: string;
}

export interface PanierItemDTO {
  id?: number;
  bassinId: number;
  nomBassin: string;
  description?: string;
  imageUrl?: string;
  prixUnitaire: number;
  prixOriginal?: number;
  effectivePrice: number;
  subtotal?: number;
  quantity: number;
  isCustomized: boolean;
  status?: string;
  orderDetails?: string;
  dureeFabrication?: string;
  dimensionSelectionnee?: string;
  materiauSelectionne?: string;
  couleurSelectionnee?: string;
  prixMateriau?: number;
  prixDimension?: number;
  prixEstime?: number;
  prixAccessoires?: number;
  promotionActive?: boolean;
  nomPromotion?: string;
  prixPromo?: number;
  tauxReduction?: number;
  accessoires?: PanierItemAccessoire[];
  addedAt?: string;
}

export interface PaymentRequest {
  commandeId?: string;
  methodeId: number;
  cartItems?: PanierItemDTO[];
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  email: string;
  cardholderName: string;
  commandeNumero?: string; // Ajouté pour correspondre au backend
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  message?: string;
  commandeId:string;
}

export interface CodeVerificationRequest {
  transactionId: string;
  verificationCode: string;
}

export interface ResendCodeRequest {
  transactionId: string;
}

export interface PaymentValidationResponse {
  success: boolean;
  message: string;
  commandeId?: string;
  referenceTransaction?: string;
}

export interface PaymentStatusResponse {
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  commandeId?: string;
  message?: string;
}
