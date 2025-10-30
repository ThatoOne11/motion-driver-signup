export namespace AuthConstants {
  export const POST_METHOD = 'POST';
  export const TOKEN_ENDPOINT = '/auth/v1/token';
  export const ACCESS_TOKEN_KEY = 'access_token';
  export const REFRESH_TOKEN_KEY = 'refresh-token';
  export const PASSWORD_GRANT_TYPE = 'password';
  export const USER_ROLE = 'user_role';
  export const MFA_TOTP_NAME = 'totp';
  export const HAS_MFA_ENABLED_NAME = 'has_enabled_mfa';
  export const HAS_MFA_VERIFIED_NAME = 'has_verified_mfa';
  export const VERIFIED_MFA_LEVEL_NAME = 'aal2';
  export const VERIFIED_MFA_STATUS = 'verified';
  export const UNVERIFIED_MFA_STATUS = 'unverified';
  export const SHOW_HEADER = 'show_header';
  export const DISPLAY_NAME = 'display_name';
}
