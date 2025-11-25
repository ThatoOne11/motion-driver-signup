export namespace SupabaseTables {
  export const ROLES = 'roles';
  export const USERS = 'users';
  export const INSPECTOR_OPTIONS = 'inspector_options';
  export const DRIVER_DOCUMENTS = 'driver_documents';
  export const DOCUMENT_UPLOAD = 'document_upload_extraction';
  export const MOTION_SUPPORT = 'motion_support';
}

export namespace SupabaseBuckets {
  export const DRIVER_DOCUMENT_UPLOADS = 'driver-document-uploads';
}

export namespace SupabaseEdgeFunctions {
  export const REGISTER_USERS = 'register-user';
  export const INSPECTOR_SEARCH = 'inspector-search';
  export const REGISTER_DRIVER = 'register-driver';
  export const DRIVER_PROFILE = 'get-driver-profile';
  export const PASSWORD_RESET = 'password-reset';
  export const SUPPORT_CALLOUT = 'support-callout';
}
