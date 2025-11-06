import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export class InspectorFormGroupBuilder {
  public static build(fb: FormBuilder): FormGroup {
    return fb.group({
      fullName: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      motionId: ['', [Validators.required]],
    });
  }
}
