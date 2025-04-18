import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-installer-home',
  templateUrl: './installer-home.component.html',
  styleUrls: ['./installer-home.component.css']
})
export class InstallerHomeComponent {
  installations: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
   
  }
}