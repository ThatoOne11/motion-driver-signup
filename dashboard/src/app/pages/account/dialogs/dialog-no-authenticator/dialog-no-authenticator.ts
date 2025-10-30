import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-no-authenticator',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './dialog-no-authenticator.html',
  styleUrl: './dialog-no-authenticator.scss',
  standalone: true,
})
export class DialogNoAuthenticator {}
