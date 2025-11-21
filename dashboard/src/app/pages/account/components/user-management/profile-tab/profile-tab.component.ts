import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DriverProfile } from '@account/models/user-management.models';

@Component({
  selector: 'app-profile-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-tab.component.html',
  styleUrl: './profile-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileTabComponent {
  profile = input.required<DriverProfile | null>();
}
