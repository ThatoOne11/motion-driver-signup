import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export class AccountFormGroupBuilder {
  constructor(private fb: FormBuilder) {}

  buildLoginForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  buildPasswordResetForm(): FormGroup {
    return this.fb.group({
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required],
    });
  }

  buildRegisterForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^0\d{9}$/)]],
      email: ['', [Validators.required, Validators.email]],
    });
  }
}
