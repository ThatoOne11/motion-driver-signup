/* eslint-disable @typescript-eslint/no-namespace */
export namespace RoutePaths {
  export const ACCOUNT = 'account';
  export const DASHBOARD = 'dashboard';
  export const INSPECTOR = 'inspector';
  export const INFORMATION = 'information';
}
export namespace AccountRoutePaths {
  export const PASSWORD_RESET = `/${RoutePaths.ACCOUNT}/password-reset`;
  export const MFA = `/${RoutePaths.ACCOUNT}/mfa`;
  export const LOGIN = `/${RoutePaths.ACCOUNT}/login`;
  export const REGISTER = `/${RoutePaths.ACCOUNT}/register`;
  export const ONBOARDING_SIGN_UP = `/${RoutePaths.ACCOUNT}/sign-up`;
  export const USER_MANAGEMENT = `/${RoutePaths.ACCOUNT}/user-management`;
  export const PENDING_VERIFICATION = `/${RoutePaths.ACCOUNT}/pending-verification`;
  export const DRIVER_SIGN_UP_FORM = `/${RoutePaths.ACCOUNT}/driver-sign-up`;
  export const DRIVER_DOCUMENTS_UPLOAD = `/${RoutePaths.ACCOUNT}/driver-documents`;
}

export namespace InformationRoutePaths {
  export const TERMS_OF_SERVICE = `/${RoutePaths.INFORMATION}/terms-of-service`;
  export const PRIVACY_POLICY = `/${RoutePaths.INFORMATION}/privacy-policy`;
  export const MORE_INFORMATION = `/${RoutePaths.INFORMATION}/more-information`;
}

export namespace InformationRouteSubPaths {
  export const TERMS_OF_SERVICE = 'terms-of-service';
  export const PRIVACY_POLICY = 'privacy-policy';
  export const MORE_INFORMATION = 'more-information';
}

export namespace AccountRouteSubPaths {
  export const PASSWORD_RESET = `password-reset`;
  export const MFA = `mfa`;
  export const LOGIN = `login`;
  export const REGISTER = `register`;
  export const ONBOARDING_SIGN_UP = `sign-up`;
  export const EMAIL_PASSTHROUGH = `passthrough`;
  export const USER_MANAGEMENT = `user-management`;
  export const PENDING_VERIFICATION = `pending-verification`;
  export const DRIVER_SIGN_UP_FORM = `driver-sign-up`;
  export const DRIVER_DOCUMENTS_UPLOAD = `driver-documents`;
}

export const ADMIN_LANDING_PAGE = `/${RoutePaths.DASHBOARD}`;
export const CLIENT_LANDING_PAGE = `/${RoutePaths.DASHBOARD}`;
export const INSPECTOR_LANDING_PAGE = `/${RoutePaths.INSPECTOR}`;
export const DRIVER_LANDING_PAGE = `/${AccountRoutePaths.USER_MANAGEMENT}`;
