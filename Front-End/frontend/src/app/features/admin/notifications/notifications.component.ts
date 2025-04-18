import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NotificationService } from '../../../core/services/notification.service';

import { Notification } from '../../../core/models/notification.models';
@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  showPanel = false;
  unreadCount = 0;
  
  constructor(private notificationService: NotificationService) {}
  
  ngOnInit(): void {
    this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });
    
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });
    
    // Charger les notifications au démarrage
    this.notificationService.loadNotifications();
  }
  
  togglePanel(): void {
    this.showPanel = !this.showPanel;
  }
  
  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
  }
  
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }
  
  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();  // Pour éviter de déclencher le markAsRead
    this.notificationService.deleteNotification(notification.id).subscribe();
  }
  
  getNotificationIcon(type: string | undefined): string {
    switch (type) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'success': return 'check_circle';
      default: return 'notifications'; // Default icon if type is undefined
    }
  }
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}