import { RoutePaths } from './routes.constants';

//A list of route paths where the main application navbar should be hidden.
export const NAVBAR_HIDDEN_ROUTES: string[] = [
  `/${RoutePaths.INSPECTOR}`,
  `/${RoutePaths.INFORMATION}`,
];
