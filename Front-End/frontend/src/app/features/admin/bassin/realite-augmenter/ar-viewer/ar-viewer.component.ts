import { Component } from '@angular/core';
import { ArService } from '../../../../../core/services/ar.service';

@Component({
  selector: 'app-ar-viewer',
  template: `
    <button (click)="startAR()">Start AR</button>
    <button (click)="stopAR()">Stop AR</button>
  `,
  styles: [
    `button { margin: 5px; padding: 10px; font-size: 16px; cursor: pointer; }`
  ]
})
export class ArViewerComponent {
  constructor(private arService: ArService) {}

  public startAR(): void {
    this.arService.startAR();
  }

  public stopAR(): void {
    this.arService.stopAR();
  }
}
