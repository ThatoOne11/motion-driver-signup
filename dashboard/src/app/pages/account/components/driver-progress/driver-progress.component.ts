import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DriverProgressStep {
  controlName: string;
  message: string;
}

@Component({
  selector: 'app-driver-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-progress.component.html',
  styleUrl: './driver-progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverProgressComponent {
  private readonly rawPercent = signal(0);
  private readonly animationToggle = signal(false);
  private readonly confettiToggle = signal(false);

  @Input()
  set percent(value: number) {
    const prevClamped = this.clampedPercent();
    const safe = Number.isFinite(value) ? value : 0;
    const current = this.rawPercent();
    this.rawPercent.set(safe);
    if (safe !== current) {
      this.animationToggle.update((prev) => !prev);
    }
    const nextClamped = this.clampedPercent();
    if (prevClamped < 100 && nextClamped >= 100) {
      this.confettiToggle.update((prev) => !prev);
    }
  }
  get percent() {
    return this.rawPercent();
  }

  @Input() message = '';

  protected readonly clampedPercent = computed(() => {
    const val = this.rawPercent();
    if (Number.isNaN(val)) return 0;
    return Math.min(100, Math.max(0, Math.round(val)));
  });
  protected readonly isIdle = computed(() => this.clampedPercent() <= 0);

  protected readonly animationClass = computed(() =>
    this.animationToggle() ? 'rev-a' : 'rev-b',
  );
  protected readonly confettiClass = computed(() => {
    if (this.clampedPercent() < 100) return '';
    return this.confettiToggle() ? 'burst-a' : 'burst-b';
  });
  protected readonly confettiPieces = [1, 2, 3, 4, 5, 6];
}
