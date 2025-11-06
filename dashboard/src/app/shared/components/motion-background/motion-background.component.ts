import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-motion-background',
  templateUrl: './motion-background.component.html',
  styleUrls: ['./motion-background.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
})
export class MotionBackgroundComponent {}
