import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export class DriverSignUpFormGroupBuilder {
  constructor(private fb: FormBuilder) {}

  buildForm(): FormGroup {
    return this.fb.group({
      platforms: [[], [Validators.required]],
      suburb: [{ value: null, disabled: true }, [Validators.required]],
      city: [{ value: null, disabled: true }, [Validators.required]],
      province: [null, [Validators.required]],
      bikeOwnership: [null, [Validators.required]],
      daysPerWeek: [null, [Validators.required]],
      yearsDriving: [null, [Validators.required]],
    });
  }
}
