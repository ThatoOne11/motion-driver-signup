export function getEnvOrThrow(name: string): string {
  const v = Deno.env.get(name);
  if (!v || v.length === 0) throw new Error(`${name} is not set`);
  return v;
}

export function getEnv(
  name: string,
  defaultValue?: string
): string | undefined {
  const v = Deno.env.get(name);
  if (v == null || v.length === 0) return defaultValue;
  return v;
}

export function getSupabaseConfig() {
  const SUPABASE_URL = getEnvOrThrow("SUPABASE_URL");
  const SERVICE_ROLE_KEY = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = getEnvOrThrow("SUPABASE_ANON_KEY");
  return { SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY };
}

export function getAppConfig() {
  const { SUPABASE_URL } = getSupabaseConfig();
  const PASSWORD_RESET_REDIRECT =
    getEnv("PASSWORD_RESET_REDIRECT") ??
    `${SUPABASE_URL}/account/password-reset`;
  const AUTH_URL = getEnv("AUTH_URL") ?? `${SUPABASE_URL}/auth/v1/verify`;
  const SITE_URL =
    getEnv("SITE_URL") ?? new URL(PASSWORD_RESET_REDIRECT).origin;
  const REDIRECT_URL =
    getEnv("REDIRECT_URL") ?? `${SITE_URL.replace(/\/+$/, "")}/account/sign-up`;
  const APP_NAME = getEnv("APP_NAME") ?? "Motion Ads";
  return {
    PASSWORD_RESET_REDIRECT,
    AUTH_URL,
    SITE_URL,
    REDIRECT_URL,
    APP_NAME,
  };
}

export function getTwilioConfig() {
  const TWILIO_ACCOUNT_SID = getEnvOrThrow("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = getEnvOrThrow("TWILIO_AUTH_TOKEN");
  const TWILIO_WHATSAPP_FROM = getEnvOrThrow("TWILIO_WHATSAPP_FROM");
  const WHATSAPP_COUNTRY_CODE = getEnv("WHATSAPP_COUNTRY_CODE") ?? "";
  const TWILIO_CONTENT_SID = getEnv("TWILIO_CONTENT_SID");
  const TWILIO_STATUS_CALLBACK_URL = getEnv("TWILIO_STATUS_CALLBACK_URL");
  const TWILIO_MESSAGING_SERVICE_SID = getEnv("TWILIO_MESSAGING_SERVICE_SID");
  const TWILIO_SMS_FROM = getEnv("TWILIO_SMS_FROM");
  const LOG_WHATSAPP = getEnv("LOG_WHATSAPP") === "1";
  const TWILIO_DRY_RUN = getEnv("TWILIO_DRY_RUN") === "1";
  return {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM,
    WHATSAPP_COUNTRY_CODE,
    TWILIO_CONTENT_SID,
    TWILIO_STATUS_CALLBACK_URL,
    TWILIO_MESSAGING_SERVICE_SID,
    TWILIO_SMS_FROM,
    LOG_WHATSAPP,
    TWILIO_DRY_RUN,
  };
}

// Gemini (Google Generative Language) configuration
export function getGeminiConfig() {
  const GEMINI_API_KEY = getEnvOrThrow("GEMINI_API_KEY");
  const GEMINI_MODEL = getEnv("GEMINI_MODEL") ?? "gemini-1.5-flash";
  return { GEMINI_API_KEY, GEMINI_MODEL };
}
