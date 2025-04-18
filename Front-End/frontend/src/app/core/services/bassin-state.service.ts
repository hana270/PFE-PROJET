import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BassinStateService {
  constructor() { }

  private bassinPersonnaliseSubject = new BehaviorSubject<boolean>(false);
  bassinPersonnalise$ = this.bassinPersonnaliseSubject.asObservable();

  setBassinPersonnalise(value: boolean) {
    console.log('Setting bassin personnalise to:', value);
    this.bassinPersonnaliseSubject.next(value);
  }

  // Ajoutez cette méthode
  getCurrentValue(): boolean {
    return this.bassinPersonnaliseSubject.value;
  }
}
