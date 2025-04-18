import { Component, OnInit } from '@angular/core';
import { ToastInfo, ToastService } from '../core/services/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit {
  toasts: ToastInfo[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toasts$.subscribe((toasts) => {
      this.toasts = toasts;
    });
  }

  removeToast(toast: ToastInfo): void {
    if (toast.id) {
      this.toastService.remove(toast.id);
    }
  }
}