import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastInfo {
  id?: string;
  header: string;
  message: string;
  classname: string;
  icon: string;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: ToastInfo[] = [];
  private toastsSubject = new BehaviorSubject<ToastInfo[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  showSuccess(message: string, duration: number = 3000): void {
    this.show({
      header: 'Succès',
      message: message,
      classname: 'bg-success text-light',
      icon: 'check-circle',
      duration: duration
    });
  }

  showError(message: string, duration: number = 5000): void {
    this.show({
      header: 'Erreur',
      message: message,
      classname: 'bg-danger text-light',
      icon: 'exclamation-triangle',
      duration: duration
    });
  }

  showInfo(message: string, duration: number = 3000): void {
    this.show({
      header: 'Information',
      message: message,
      classname: 'bg-info text-light',
      icon: 'info-circle',
      duration: duration
    });
  }

  showWarning(message: string, duration: number = 4000): void {
    this.show({
      header: 'Attention',
      message: message,
      classname: 'bg-warning text-dark',
      icon: 'exclamation-circle',
      duration: duration
    });
  }

  private show(toast: ToastInfo): void {
    toast.id = Math.random().toString(36).substring(2);
    this.toasts.push(toast);
    this.toastsSubject.next([...this.toasts]);

    setTimeout(() => this.remove(toast.id!), toast.duration);
  }

  remove(toastId: string): void {
    this.toasts = this.toasts.filter(t => t.id !== toastId);
    this.toastsSubject.next([...this.toasts]);
  }
  
}