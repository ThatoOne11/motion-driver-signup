import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MotionBackgroundComponent } from '@shared-components/motion-background/motion-background.component';
import { InspectorFormGroupBuilder } from './models/form-groups/inspector-form-group-builder';
import { AuthService } from '@core/services/auth/auth.service';

@Component({
  selector: 'app-inspector',
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MotionBackgroundComponent,
  ],
})
export class InspectorComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected inspectorForm: FormGroup;

  constructor() {
    this.inspectorForm = InspectorFormGroupBuilder.build(this.fb);
  }

  protected createDriver(): void {
    if (this.inspectorForm.invalid) {
      this.inspectorForm.markAllAsTouched();
      return;
    }
    //TODO: Driver creation implementation will go here.
    console.log(
      'Form Submitted. Creating driver with:',
      this.inspectorForm.value,
    );
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
