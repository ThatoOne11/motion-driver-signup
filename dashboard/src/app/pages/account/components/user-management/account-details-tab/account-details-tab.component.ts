import { BankingDetails } from '@account/models/user-management.models';
import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-account-details-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-details-tab.component.html',
  styleUrl: './account-details-tab.component.scss',
})
export class AccountDetailsTabComponent {
  bankingDetails = input.required<BankingDetails | null>();
}
