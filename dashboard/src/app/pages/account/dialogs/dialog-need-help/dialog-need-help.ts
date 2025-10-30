import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-need-help',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './dialog-need-help.html',
  styleUrl: './dialog-need-help.scss',
  standalone: true,
})
export class DialogNeedHelp {
  dialogRef = inject(MatDialogRef<DialogNeedHelp>);

  close() {
    this.dialogRef.close('Closed!');
  }
}
