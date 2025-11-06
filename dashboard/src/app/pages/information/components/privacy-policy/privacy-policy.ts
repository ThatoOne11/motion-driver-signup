import { Component } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { Location } from '@angular/common';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';

@Component({
  selector: 'app-privacy-policy',
  imports: [MarkdownComponent, MotionBackgroundComponent],
  templateUrl: './privacy-policy.html',
  styleUrl: './privacy-policy.scss',
})
export class PrivacyPolicy {
  readonly termsSource = 'assets/markdown/privacy-policy.md';

  constructor(private readonly location: Location) {}

  close(): void {
    this.location.back();
  }
}
