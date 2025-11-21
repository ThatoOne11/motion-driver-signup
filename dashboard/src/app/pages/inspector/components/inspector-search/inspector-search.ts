import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatRadioModule } from '@angular/material/radio';
import { InspectorMatch } from '../../config/inspector-search.config';

@Component({
  selector: 'app-inspector-search',
  standalone: true,
  imports: [CommonModule, MatRadioModule],
  templateUrl: './inspector-search.html',
  styleUrls: ['./inspector-search.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectorSearchComponent {
  @Input({ required: true }) matches: InspectorMatch[] = [];
  @Input({ required: true }) matchCount = 0;
  @Input() selectedRecordId: string | null = null;
  @Output() matchSelected = new EventEmitter<string>();

  protected handleSelection(recordId: string): void {
    this.matchSelected.emit(recordId);
  }

  protected formatTitle(match: InspectorMatch): string {
    const motionId = match.motionId ?? 'Unknown ID';
    return `${motionId} - ${match.name}`;
  }

  protected formatPhone(match: InspectorMatch): string {
    return match.phone ?? 'No phone on record';
  }

  protected formatEmail(match: InspectorMatch): string {
    return match.email ?? 'No email on record';
  }
}
