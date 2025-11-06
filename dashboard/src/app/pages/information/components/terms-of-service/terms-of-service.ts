import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';

@Component({
  selector: 'app-terms-of-service',
  imports: [MarkdownComponent, MotionBackgroundComponent],
  templateUrl: './terms-of-service.html',
  styleUrl: './terms-of-service.scss',
})
export class TermsOfService {
  readonly termsSource = 'assets/markdown/terms-of-service.md';

  constructor(private readonly location: Location) {}

  close(): void {
    this.location.back();
  }
}
