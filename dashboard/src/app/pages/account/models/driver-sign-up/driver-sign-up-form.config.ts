import { WritableSignal } from '@angular/core';
import { FieldTree, disabled, form, required } from '@angular/forms/signals';

import { DriverSignUpFormModel } from './driver-sign-up-form.types';

type DriverSignUpFormFactoryOptions = {
  model: WritableSignal<DriverSignUpFormModel>;
  hasValue: (value: unknown) => boolean;
};

export function createDriverSignUpForm({
  model,
  hasValue,
}: DriverSignUpFormFactoryOptions): FieldTree<DriverSignUpFormModel> {
  return form(model, (path) => {
    required(path.province, { message: 'Select your province.' });
    required(path.city, { message: 'Select your city.' });
    required(path.suburb, { message: 'Select your suburb.' });
    required(path.platforms, {
      message: 'Select the companies you drive for.',
    });
    required(path.bikeOwnership, { message: 'Select your bike ownership.' });
    required(path.yearsDriving, {
      message: 'Select your years of driving experience.',
    });

    disabled(path.province, ({ state }) => state.submitting());
    disabled(path.city, ({ valueOf }) => !valueOf(path.province));
    disabled(path.city, ({ state }) => state.submitting());
    disabled(path.suburb, ({ valueOf }) => !valueOf(path.city));
    disabled(path.suburb, ({ state }) => state.submitting());
    disabled(path.platforms, ({ valueOf }) => !hasValue(valueOf(path.suburb)));
    disabled(path.platforms, ({ state }) => state.submitting());
    disabled(
      path.bikeOwnership,
      ({ valueOf }) => !hasValue(valueOf(path.platforms)),
    );
    disabled(path.bikeOwnership, ({ state }) => state.submitting());
    disabled(path.yearsDriving, ({ valueOf }) => !valueOf(path.bikeOwnership));
    disabled(path.yearsDriving, ({ state }) => state.submitting());
  });
}
