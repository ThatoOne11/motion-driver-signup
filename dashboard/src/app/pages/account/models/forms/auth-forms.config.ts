import { WritableSignal } from '@angular/core';
import {
  FieldTree,
  email,
  form,
  pattern,
  required,
} from '@angular/forms/signals';

export type LoginFormModel = {
  email: string;
  password: string;
};

export type RegisterFormModel = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export const PHONE_PATTERN = /^0\d{9}$/;

export function createLoginForm(
  model: WritableSignal<LoginFormModel>,
): FieldTree<LoginFormModel> {
  return form(model, (path) => {
    required(path.email, { message: 'Email is required.' });
    email(path.email, { message: 'Enter a valid email address.' });
    required(path.password, { message: 'Password is required.' });
  });
}

export function createRegisterForm(
  model: WritableSignal<RegisterFormModel>,
): FieldTree<RegisterFormModel> {
  return form(model, (path) => {
    required(path.firstName, { message: 'First name is required.' });
    required(path.lastName, { message: 'Last name is required.' });
    required(path.phone, { message: 'Phone number is required.' });
    pattern(path.phone, PHONE_PATTERN, {
      message: 'Phone must start with 0 and be 10 digits.',
    });
    required(path.email, { message: 'Email is required.' });
    email(path.email, { message: 'Enter a valid email address.' });
  });
}
