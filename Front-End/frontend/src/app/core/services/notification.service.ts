import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Notification } from '../models/notification.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8082/notifications/api/notifications';
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  
  // Pour les toasts
  private toasts: any[] = [];
  private toastSubject = new BehaviorSubject<any[]>([]);
  toasts$ = this.toastSubject.asObservable();

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  private promotionUpdateSource = new Subject<void>();
  promotionUpdate$ = this.promotionUpdateSource.asObservable();
  
  constructor(private http: HttpClient) {}

  // Méthodes pour les toasts
  showSuccess(message: string, duration: number = 3000): void {
    this.showToast('Succès', message, 'success', duration);
  }

  showError(message: string, duration: number = 5000): void {
    this.showToast('Erreur', message, 'error', duration);
  }

  showInfo(message: string, duration: number = 3000): void {
    this.showToast('Information', message, 'info', duration);
  }

  showWarning(message: string, duration: number = 4000): void {
    this.showToast('Attention', message, 'warning', duration);
  }

  private showToast(title: string, message: string, type: string, duration: number): void {
    const toast = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
      duration
    };

    this.toasts.push(toast);
    this.toastSubject.next([...this.toasts]);

    setTimeout(() => this.removeToast(toast.id), duration);
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.toastSubject.next([...this.toasts]);
  }

  // Le reste de vos méthodes existantes...
  loadNotifications() {
    this.http.get<Notification[]>(this.apiUrl).pipe(
      catchError(this.handleError<Notification[]>('loadNotifications', []))
    ).subscribe(notifications => {
      this.notificationsSubject.next(notifications);
      this.updateUnreadCount(notifications);
    });
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put<Notification>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.map(n => 
          n.id === id ? { ...n, read: true } : n
        );
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
      }),
      catchError(this.handleError<any>('markAsRead'))
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.map(n => 
          ({ ...n, read: true })
        );
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
      }),
      catchError(this.handleError<any>('markAllAsRead'))
    );
  }

  deleteNotification(id: number): Observable<any> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.filter(n => n.id !== id);
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
      }),
      catchError(this.handleError<any>('deleteNotification'))
    );
  }

  private updateUnreadCount(notifications: Notification[]) {
    const count = notifications.filter(n => !n.read).length;
    this.unreadCountSubject.next(count);
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }

  notifyPromotionUpdate(): void {
    console.log('NotificationService: émission d\'un événement de mise à jour des promotions');
    this.promotionUpdateSource.next();
  }
}