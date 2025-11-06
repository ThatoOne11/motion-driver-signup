import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-support-callout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './support-callout.html',
  styleUrl: './support-callout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportCalloutComponent {}
