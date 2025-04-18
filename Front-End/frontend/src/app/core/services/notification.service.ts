import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Notification } from '../models/notification.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8089/aquatresor/api/notifications';
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  
  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  private promotionUpdateSource = new Subject<void>();
  
  promotionUpdate$ = this.promotionUpdateSource.asObservable();
  
  constructor(private http: HttpClient) {}

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
      // Let the app keep running by returning an empty result
      return of(result as T);
    };
  }

  
  notifyPromotionUpdate(): void {
    console.log('NotificationService: émission d\'un événement de mise à jour des promotions');
    this.promotionUpdateSource.next(); // Utiliser promotionUpdateSource au lieu de promotionUpdateSubject
  }
}