import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentService } from '../../../core/services/payment.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-card-payment',
  templateUrl: './card-payment.component.html',
  styleUrls: ['./card-payment.component.css']
})
export class CardPaymentComponent implements OnInit {
  paymentForm: FormGroup;
  isLoading = false;
  paymentData: any;
  months: number[] = Array.from({length: 12}, (_, i) => i + 1);
  years: number[] = Array.from({length: 10}, (_, i) => new Date().getFullYear() + i);

  transactionId: string = '';
  email: string = '';
  commandeId: string = '';
  commandeNumero: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private paymentService: PaymentService
  ) {
    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      expiryMonth: ['', [Validators.required]],
      expiryYear: ['', [Validators.required]],
      securityCode: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
      cardholderName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Get state from navigation
    const navigation = this.router.getCurrentNavigation();
    this.paymentData = navigation?.extras?.state?.['paymentData'];

    if (!this.paymentData) {
      // Try to get from history state (in case of page refresh)
      this.paymentData = history.state.paymentData;
    }

    if (this.paymentData) {
      console.log('Payment data received:', this.paymentData);
      
      // Pre-fill email if available
      if (this.paymentData.clientInfo?.email) {
        this.paymentForm.patchValue({
          email: this.paymentData.clientInfo.email
        });
      }
    } else {
      console.error('No payment data received');
      Swal.fire({
        title: 'Erreur',
        text: 'Impossible de récupérer les informations de commande',
        icon: 'error',
        confirmButtonText: 'OK'
      }).then(() => {
        this.router.navigate(['/checkout']);
      });
    }
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      Swal.fire({
        title: 'Formulaire incomplet',
        text: 'Veuillez remplir correctement tous les champs du formulaire.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
  
    this.isLoading = true;
    
    Swal.fire({
      title: 'Traitement en cours',
      html: 'Veuillez patienter pendant que nous traitons votre paiement...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  
    const paymentRequest: any = {
      methodeId: 1,
      cartItems: this.paymentData.cartItems || [],
      cardNumber: this.paymentForm.value.cardNumber.replace(/\s+/g, ''),
      expiryMonth: this.paymentForm.value.expiryMonth.toString().padStart(2, '0'),
      expiryYear: this.paymentForm.value.expiryYear.toString().slice(-2),
      cvv: this.paymentForm.value.securityCode,
      cardholderName: this.paymentForm.value.cardholderName,
      email: this.paymentForm.value.email,
      clientId: this.paymentData.clientInfo?.id || null,
      panierId: this.paymentData.panierId || null
    };
  
    if (this.paymentData.commandeId) {
      paymentRequest.commandeId = this.paymentData.commandeId;
    }
    
    if (this.paymentData.commandeNumero) {
      paymentRequest.commandeNumero = this.paymentData.commandeNumero;
    }
  
    if (this.paymentData.deliveryInfo) {
      paymentRequest.deliveryInfo = this.paymentData.deliveryInfo;
    }
  
    // Sauvegarder les données dans le localStorage avant la requête
    localStorage.setItem('paymentData', JSON.stringify(this.paymentData));
    localStorage.setItem('paymentFormEmail', this.paymentForm.value.email);
  
    this.paymentService.initiatePayment(paymentRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        Swal.close();
        
        if (!response.transactionId) {
          Swal.fire({
            title: 'Erreur',
            text: 'Aucun identifiant de transaction n\'a été retourné',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6'
          });
          return;
        }
        
        // Sauvegarder les infos de transaction
        const transactionData = {
          transactionId: response.transactionId,
          email: this.paymentForm.value.email,
          commandeId: response.commandeId || this.paymentData.commandeId,
          commandeNumero: this.paymentData.commandeNumero
        };
        
        localStorage.setItem('currentTransaction', JSON.stringify(transactionData));
        
        // Si un message d'erreur est retourné concernant l'envoi d'email
        if (response.message && (
            response.message.includes('échec') || 
            response.message.includes('email') || 
            response.message.includes('SMTP') ||
            response.message.includes('code'))) {
          
          Swal.fire({
            title: 'Attention',
            text: response.message,
            icon: 'warning',
            confirmButtonText: 'Continuer vers la vérification',
            confirmButtonColor: '#3085d6'
          }).then((result) => {
            if (result.isConfirmed) {
              this.navigateToVerification(transactionData);
            }
          });
        } else {
          // Cas normal - navigation directe
          this.navigateToVerification(transactionData);
        }
      },
      error: (err) => {
        this.isLoading = false;
        Swal.close();
        
        console.error('Erreur lors du traitement du paiement:', err);
        
        // Case for SMTP error but with transaction ID
        if (err.error && err.error.transactionId && 
            (err.error.message?.includes('SMTP') || 
             err.error.message?.includes('email'))) {
          
          Swal.fire({
            title: 'Erreur partielle',
            html: `
              <p>Le paiement a été enregistré mais l'envoi du code a échoué.</p>
              <p>Vous pouvez continuer vers la page de vérification et utiliser la fonction "Renvoyer le code".</p>
            `,
            icon: 'warning',
            confirmButtonText: 'Continuer vers la vérification',
            confirmButtonColor: '#3085d6'
          }).then((result) => {
            if (result.isConfirmed) {
              const transactionData = {
                transactionId: err.error.transactionId,
                email: this.paymentForm.value.email,
                commandeId: this.paymentData.commandeId,
                commandeNumero: this.paymentData.commandeNumero
              };
              this.navigateToVerification(transactionData);
            }
          });
        } else {
          // Other errors
          let errorMessage = err.error?.message || 'Erreur inconnue';
          
          Swal.fire({
            title: 'Erreur de paiement',
            html: `
              <p>Une erreur est survenue lors du traitement de votre paiement :</p>
              <p class="text-danger">${errorMessage}</p>
              <p>Veuillez réessayer ou contacter le support.</p>
            `,
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6'
          });
        }
      }
    });
  }
  
  navigateToVerification(transactionData: any): void {
    // Method 1: Navigate with state (most reliable)
    this.router.navigate(['/payment/verify'], { 
      state: transactionData 
    });
    
    // Method 2: Also include as query params (fallback)
    // This creates a URL like '/payment/verify?transactionId=xyz&email=abc@example.com'
    /*
    this.router.navigate(['/payment/verify'], { 
      queryParams: {
        transactionId: transactionData.transactionId,
        email: transactionData.email,
        commandeId: transactionData.commandeId,
        commandeNumero: transactionData.commandeNumero
      }
    });
    */
  }
  
 

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (value.length > 16) {
      value = value.substring(0, 16);
    }
    
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    input.value = formatted;
    this.paymentForm.get('cardNumber')?.setValue(value);
  }
}