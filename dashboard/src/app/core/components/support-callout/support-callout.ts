import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { SupportCalloutDialogComponent } from './support-callout-dialog/support-callout-dialog';
import { SupportService } from '@core/services/support.service';

@Component({
  selector: 'app-support-callout',
  standalone: true,
  imports: [MatDialogModule],
  templateUrl: './support-callout.html',
  styleUrl: './support-callout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportCalloutComponent {
  @Input() preMessage = '';
  @Input() name = '';
  @Input() motionId = '';
  @Input() sourceTag = '';

  private readonly dialog = inject(MatDialog);
  private readonly supportService = inject(SupportService);

  async openDialog() {
    const context = await this.supportService.getOptionalUserContext();

    this.dialog.open(SupportCalloutDialogComponent, {
      width: '420px',
      data: {
        preMessage: this.preMessage,
        name: this.name || context.name || '',
        motionId: this.motionId || context.motionId || '',
        sourceTag: this.sourceTag,
        initialUserEmail: context.email,
        initialUserName: context.name,
        initialMotionId: context.motionId,
      },
    });
  }
}
