import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.css'],
})
export class LoadingComponent implements OnInit {
  isLoading$!: Observable<boolean>; // Déclaration correcte de l'Observable

  constructor(
    private loadingService: LoadingService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.isLoading$ = this.loadingService.isLoading$; // Initialisation dans ngOnInit()
  }
}
