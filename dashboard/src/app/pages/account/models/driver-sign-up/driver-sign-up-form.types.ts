export type DriverSignUpOption = { id: string; name: string };

export type DriverSignUpYearsOption = { id: string; label: string };

export type DriverSignUpFormModel = {
  province: string;
  city: string;
  suburb: string;
  platforms: string[];
  bikeOwnership: string;
  yearsDriving: string;
  daysPerWeek: number | null;
};

export type DriverProgressStepDefinition = {
  controlName: keyof DriverSignUpFormModel;
  message: string;
};

export const DRIVER_SIGN_UP_PROGRESS_STEPS: DriverProgressStepDefinition[] = [
  { controlName: 'province', message: 'Select your province.' },
  { controlName: 'city', message: 'Select your city.' },
  { controlName: 'suburb', message: 'Select your suburb.' },
  {
    controlName: 'platforms',
    message: 'Select the companies you drive for.',
  },
  { controlName: 'bikeOwnership', message: 'Select your bike ownership.' },
  { controlName: 'yearsDriving', message: 'Select your years of driving.' },
];
