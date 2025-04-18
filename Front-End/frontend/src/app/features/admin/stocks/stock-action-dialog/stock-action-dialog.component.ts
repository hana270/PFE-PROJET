import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Bassin } from '../../../../core/models/bassin.models';
import Swal from 'sweetalert2';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface DialogData {
  bassin: Bassin;
  action: 'ajuster' | 'archiver' | 'desarchiver';
}

enum ActionType {
  ADDITION = 'addition',
  SUBTRACTION = 'subtraction'
}

interface StockReason {
  id: string;
  label: string;
  type: ActionType;
  icon: string;
}

@Component({
  selector: 'app-stock-action-dialog',
  templateUrl: './stock-action-dialog.component.html',
  styleUrls: ['./stock-action-dialog.component.css']
})
export class StockActionDialogComponent implements OnInit {
  actionForm!: FormGroup;
  currentStock: number;
  newStock: number;
  actionType = ActionType;
  
  // Raisons structurées avec leur type et icône
  reasons: StockReason[] = [
    { id: 'restock', label: 'Réapprovisionnement', type: ActionType.ADDITION, icon: 'inventory_2' },
    { id: 'adjustment_add', label: 'Ajustement inventaire (+)', type: ActionType.ADDITION, icon: 'trending_up' },
    { id: 'return', label: 'Retour client', type: ActionType.ADDITION, icon: 'assignment_return' },
    { id: 'sale', label: 'Vente', type: ActionType.SUBTRACTION, icon: 'shopping_cart' },
    { id: 'loss', label: 'Perte/Dommage', type: ActionType.SUBTRACTION, icon: 'dangerous' },
    { id: 'adjustment_sub', label: 'Ajustement inventaire (-)', type: ActionType.SUBTRACTION, icon: 'trending_down' },
    { id: 'other', label: 'Autre raison', type: ActionType.ADDITION, icon: 'more_horiz' }
  ];

  constructor(
    public dialogRef: MatDialogRef<StockActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder
  ) {
    this.currentStock = this.data.bassin.stock;
    this.newStock = this.currentStock;
  }

  ngOnInit(): void {
    this.initForm();
    
    if (this.data.action === 'ajuster') {
      // Observer les changements de raison
      this.actionForm.get('raison')?.valueChanges.subscribe(raison => {
        const selectedReason = this.reasons.find(r => r.id === raison);
        if (selectedReason) {
          // Réinitialiser la quantité
          this.actionForm.get('quantite')?.setValue(0);
          
          // Mettre à jour la validation en fonction du type d'action
          if (selectedReason.type === ActionType.SUBTRACTION) {
            this.actionForm.get('quantite')?.setValidators([
              Validators.required, 
              Validators.min(1), 
              Validators.max(this.currentStock),
              this.validateSubtraction.bind(this)
            ]);
          } else {
            this.actionForm.get('quantite')?.setValidators([
              Validators.required, 
              Validators.min(1)
            ]);
          }
          this.actionForm.get('quantite')?.updateValueAndValidity();
        }
      });

      // Observer les changements de quantité
      this.actionForm.get('quantite')?.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(value => {
          this.updateNewStock();
        });
    }
  }

  initForm(): void {
    if (this.data.action === 'ajuster') {
      this.actionForm = this.fb.group({
        quantite: [0, [Validators.required, Validators.min(1)]],
        raison: ['', Validators.required],
        autreRaison: [''],
        commentaire: ['', Validators.maxLength(250)]
      }, { validators: this.stockValidator });
    } else if (this.data.action === 'desarchiver') {
      this.actionForm = this.fb.group({
        nouvelleQuantite: [1, [Validators.required, Validators.min(1)]]
      });
    } else {
      this.actionForm = this.fb.group({});
    }
  }

  // Validation pour s'assurer que la déduction ne mène pas à un stock négatif
  validateSubtraction(control: AbstractControl): ValidationErrors | null {
    const quantite = control.value || 0;
    const selectedReason = this.actionForm?.get('raison')?.value;
    const reason = this.reasons.find(r => r.id === selectedReason);
    
    if (reason?.type === ActionType.SUBTRACTION && this.currentStock - quantite < 0) {
      return { invalidSubtraction: true };
    }
    return null;
  }

  // Validateur global pour le formulaire
  stockValidator(group: FormGroup): ValidationErrors | null {
    const quantite = group.get('quantite')?.value || 0;
    const raison = group.get('raison')?.value;
    const autreRaison = group.get('autreRaison')?.value;

    // Vérifier si "Autre raison" est sélectionnée mais le champ est vide
    if (raison === 'other' && !autreRaison) {
      return { autreRaisonRequise: true };
    }

    return null;
  }

  adjustQuantity(value: number): void {
    const currentValue = this.actionForm.get('quantite')?.value || 0;
    const newValue = currentValue + value;
    
    // Vérifier si c'est une soustraction et respecter la limite de stock
    const selectedReason = this.reasons.find(r => r.id === this.actionForm.get('raison')?.value);
    
    if (selectedReason?.type === ActionType.SUBTRACTION) {
      if (newValue > this.currentStock) {
        Swal.fire({
          title: 'Attention',
          text: 'Vous ne pouvez pas retirer plus que le stock disponible.',
          icon: 'warning',
          confirmButtonText: 'Compris'
        });
        return;
      }
    }
    
    if (newValue >= 0) {
      this.actionForm.get('quantite')?.setValue(newValue);
      this.updateNewStock();
    }
  }

  updateNewStock(): void {
    const quantite = this.actionForm.get('quantite')?.value || 0;
    const selectedReason = this.reasons.find(r => r.id === this.actionForm.get('raison')?.value);
    
    if (selectedReason) {
      if (selectedReason.type === ActionType.ADDITION) {
        this.newStock = this.currentStock + quantite;
      } else {
        this.newStock = this.currentStock - quantite;
      }
    }
  }
  
  getStockStatusClass(): string {
    if (this.newStock < 5 && this.newStock >= 0) {
      return 'stock-warning';
    } else if (this.newStock < 0) {
      return 'stock-danger';
    } else {
      return 'stock-normal';
    }
  }

  onCancelClick(): void {
    this.dialogRef.close();
  }

  onSubmitClick(): void {
    if (this.data.action === 'ajuster' && this.actionForm.valid) {
      const formValue = this.actionForm.value;
      const selectedReason = this.reasons.find(r => r.id === formValue.raison);
      
      // Déterminer le libellé de la raison
      let raisonLibelle: string;
      if (formValue.raison === 'other') {
        raisonLibelle = formValue.autreRaison;
      } else {
        raisonLibelle = selectedReason?.label || '';
      }
      
      // Ajouter le commentaire si présent
      const raisonComplete = formValue.commentaire ? `${raisonLibelle} - ${formValue.commentaire}` : raisonLibelle;
      
      // Déterminer si le stock doit être incrémenté ou décrémenté
      const quantite = formValue.quantite;
      const finalQuantite = selectedReason?.type === ActionType.ADDITION ? quantite : -quantite;
      
      // Vérification finale avant soumission
      if (this.currentStock + finalQuantite < 0) {
        Swal.fire('Erreur', 'L\'opération entraînerait un stock négatif.', 'error');
        return;
      }
      
      this.dialogRef.close({
        quantite: finalQuantite,
        raison: raisonComplete
      });
    } else if (this.data.action === 'desarchiver' && this.actionForm.valid) {
      this.dialogRef.close({
        nouvelleQuantite: this.actionForm.value.nouvelleQuantite
      });
    } else if (this.data.action === 'archiver') {
      this.dialogRef.close(true);
    }
  }

  getDialogTitle(): string {
    switch(this.data.action) {
      case 'ajuster': return 'Ajuster le stock';
      case 'archiver': return 'Archiver le bassin';
      case 'desarchiver': return 'Désarchiver le bassin';
      default: return 'Action';
    }
  }

  getSubmitButtonText(): string {
    switch(this.data.action) {
      case 'ajuster': return 'Confirmer l\'ajustement';
      case 'archiver': return 'Confirmer l\'archivage';
      case 'desarchiver': return 'Confirmer la réactivation';
      default: return 'Confirmer';
    }
  }
  
  getSubmitButtonColor(): string {
    switch(this.data.action) {
      case 'ajuster': return 'btn-primary';
      case 'archiver': return 'btn-danger';
      case 'desarchiver': return 'btn-success';
      default: return 'btn-primary';
    }
  }
  
  isReasonTypeSubtraction(): boolean {
    const selectedReason = this.reasons.find(r => r.id === this.actionForm.get('raison')?.value);
    return selectedReason?.type === ActionType.SUBTRACTION;
  }
}