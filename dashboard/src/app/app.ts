import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { registerCustomSvgIcons } from '@core/utils/register-svg-icons';
import { Navbar } from '@core/components/navbar/navbar';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '@core/components/loader/loader';
import { ToastComponent } from '@core/components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Navbar,
    MatIconModule,
    CommonModule,
    LoaderComponent,
    ToastComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true,
})
export class App {
  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    registerCustomSvgIcons(this.matIconRegistry, this.domSanitizer);
  }
}
