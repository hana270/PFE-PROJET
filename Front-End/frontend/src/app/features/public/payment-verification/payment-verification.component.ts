import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../../core/services/payment.service';
import { CartService } from '../../../core/services/cart.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-payment-verification',
  templateUrl: './payment-verification.component.html',
  styleUrls: ['./payment-verification.component.css']
})
export class PaymentVerificationComponent implements OnInit {
  verificationForm: FormGroup;
  isLoading = false;
  transactionId: string = '';
  email: string = '';
  commandeId: string = '';
  commandeNumero: string = '';
  resendDisabled = false;
  resendCountdown = 0;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private cartService: CartService
  ) {
    this.verificationForm = this.fb.group({
      verificationCode: ['', [
        Validators.required, 
        Validators.pattern(/^\d{6}$/)
      ]]
    });
  }

  ngOnInit(): void {
    // First check query parameters (in case of redirect)
    this.route.queryParams.subscribe(params => {
      if (params['transactionId']) {
        this.transactionId = params['transactionId'];
        this.email = params['email'] || '';
        this.commandeId = params['commandeId'] || '';
        this.commandeNumero = params['commandeNumero'] || '';
        
        // Save to localStorage as backup
        this.saveTransactionDataToLocalStorage();
      } else {
        this.checkNavigationAndLocalStorage();
      }
    });
  }

  private checkNavigationAndLocalStorage(): void {
    // Check navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as {
      transactionId: string;
      email: string;
      commandeId: string;
      commandeNumero: string;
    };
  
    if (state?.transactionId) {
      this.transactionId = state.transactionId;
      this.email = state.email || '';
      this.commandeId = state.commandeId || '';
      this.commandeNumero = state.commandeNumero || '';
      
      // Save to localStorage
      this.saveTransactionDataToLocalStorage();
    } else {
      // Check localStorage as fallback
      const storedTransaction = localStorage.getItem('currentTransaction');
      if (storedTransaction) {
        try {
          const transactionData = JSON.parse(storedTransaction);
          this.transactionId = transactionData.transactionId || '';
          this.email = transactionData.email || '';
          this.commandeId = transactionData.commandeId || '';
          this.commandeNumero = transactionData.commandeNumero || '';
        } catch (e) {
          console.error('Error parsing transaction data from localStorage', e);
        }
      }
      
      // Individual items in localStorage as final fallback
      if (!this.transactionId) {
        this.transactionId = localStorage.getItem('currentTransactionId') || '';
        this.email = localStorage.getItem('currentTransactionEmail') || '';
        this.commandeId = localStorage.getItem('currentCommandeId') || '';
        this.commandeNumero = localStorage.getItem('currentCommandeNumero') || '';
      }
  
      if (!this.transactionId) {
        Swal.fire({
          title: 'Erreur',
          text: 'Information de transaction manquante',
          icon: 'error',
          confirmButtonText: 'Retour au panier',
          confirmButtonColor: '#3085d6'
        }).then(() => {
          this.router.navigate(['/checkout']);
        });
      }
    }
  }

  private saveTransactionDataToLocalStorage(): void {
    if (this.transactionId) {
      // Save as a complete object
      const transactionData = {
        transactionId: this.transactionId,
        email: this.email,
        commandeId: this.commandeId,
        commandeNumero: this.commandeNumero
      };
      localStorage.setItem('currentTransaction', JSON.stringify(transactionData));
      
      // Also save individual items for backward compatibility
      localStorage.setItem('currentTransactionId', this.transactionId);
      if (this.email) localStorage.setItem('currentTransactionEmail', this.email);
      if (this.commandeId) localStorage.setItem('currentCommandeId', this.commandeId);
      if (this.commandeNumero) localStorage.setItem('currentCommandeNumero', this.commandeNumero);
    }
  }

  onSubmit(): void {
    if (this.verificationForm.invalid || !this.transactionId) {
      Swal.fire({
        title: 'Erreur',
        text: 'Veuillez entrer un code de vérification valide à 6 chiffres',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    this.isLoading = true;
    Swal.fire({
      title: 'Vérification en cours',
      html: 'Veuillez patienter pendant que nous vérifions votre code...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const request = {
      transactionId: this.transactionId,
      verificationCode: this.verificationForm.value.verificationCode
    };

    this.paymentService.verifyCode(request).subscribe({
      next: (response) => {
        Swal.close();
        this.isLoading = false;
        
       // In payment-verification.component.ts, modify the success handler:
if (response.success) {
  this.clearTransactionDataFromLocalStorage();
  
  this.cartService.clearCart().subscribe({
    next: () => {
      // Use commandeNumero instead of commandeId
      const commandeNumero = response.commandeId || this.commandeNumero;
      if (commandeNumero) {
        this.router.navigate(['/commande-confirmation', commandeNumero]);
      } else {
        this.router.navigate(['/commande-confirmation']);
      }
    },
    error: (err) => {
      console.error('Error clearing cart:', err);
      const commandeNumero = response.commandeId || this.commandeNumero;
      if (commandeNumero) {
        this.router.navigate(['/commande-confirmation', commandeNumero]);
      } else {
        this.router.navigate(['/commande-confirmation']);
      }
    }
  });
} else {
          Swal.fire({
            title: 'Erreur',
            text: response.message || 'Code de vérification incorrect',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6'
          });
        }
      },
      error: (err) => {
        Swal.close();
        this.isLoading = false;
        Swal.fire({
          title: 'Erreur',
          text: err.error?.message || 'Erreur lors de la vérification',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }

  private clearTransactionDataFromLocalStorage(): void {
    localStorage.removeItem('currentTransaction');
    localStorage.removeItem('currentTransactionId');
    localStorage.removeItem('currentTransactionEmail');
    localStorage.removeItem('currentCommandeId');
    localStorage.removeItem('currentCommandeNumero');
    localStorage.removeItem('paymentData');
    localStorage.removeItem('paymentFormEmail');
  }

  resendVerificationCode(): void {
    if (!this.transactionId || this.resendDisabled) return;

    this.isLoading = true;
    this.resendDisabled = true;
    this.resendCountdown = 60;

    Swal.fire({
      title: 'Envoi en cours',
      html: 'Veuillez patienter pendant que nous envoyons un nouveau code...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.paymentService.resendVerificationCode(this.transactionId).subscribe({
      next: (response) => {
        Swal.close();
        this.isLoading = false;
        
        if (response) {
          Swal.fire({
            title: 'Succès',
            text: 'Un nouveau code a été envoyé à votre adresse email',
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6'
          });

          // Start countdown for resend button
          const interval = setInterval(() => {
            this.resendCountdown--;
            if (this.resendCountdown <= 0) {
              this.resendDisabled = false;
              clearInterval(interval);
            }
          }, 1000);
        } else {
          this.resendDisabled = false;
          Swal.fire({
            title: 'Erreur',
            text: 'Erreur lors de l\'envoi du code. Veuillez réessayer.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6'
          });
        }
      },
      error: (err) => {
        Swal.close();
        this.isLoading = false;
        this.resendDisabled = false;
        Swal.fire({
          title: 'Erreur',
          text: 'Erreur lors de l\'envoi du code: ' + (err.error?.message || err.message || 'Erreur inconnue'),
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }
}