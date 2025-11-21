// deno-lint-ignore-file no-explicit-any
import {
  getTwilioConfig,
  getAppConfig,
  getSupabaseConfig,
  getEnvBool,
} from "../../_shared/config.ts";
import { normalizePhoneNumber } from "../helper-functions/normalize-phone.ts";
// ---------- Helpers
function toPhoneToE164(raw: string, cc: string): string {
  return normalizePhoneNumber(raw, cc);
}
function ensureWhatsappPrefix(v: string) {
  return v.startsWith("whatsapp:") ? v : `whatsapp:${v}`;
}
function buildTokenAndSmsUrl(tokenHash: string) {
  const { SITE_URL, PASSWORD_RESET_REDIRECT, AUTH_URL, REDIRECT_URL } =
    getAppConfig();
  const siteEnv = (SITE_URL || "").replace(/\/+$/, "");
  const passthroughBase = (
    PASSWORD_RESET_REDIRECT || `${siteEnv}/account/passthrough`
  ).replace(/\/+$/, "");
  const authUrl = (
    AUTH_URL || `${getSupabaseConfig().SUPABASE_URL}/auth/v1/verify`
  ).replace(/\/+$/, "");
  // Use REDIRECT_URL env or default to SITE_URL/account/sign-up
  const redirectTo = (REDIRECT_URL || `${siteEnv}/account/sign-up`).replace(
    /\/+$/,
    ""
  );
  const redirectEncoded = encodeURIComponent(redirectTo);
  const passthroughLink = `${authUrl}?token=${tokenHash}&type=invite&redirect_to=${redirectEncoded}`;
  const encodedPassthrough = encodeURIComponent(passthroughLink);
  const message = encodeURIComponent(
    "Please click the link to verify your email!"
  );
  const fullSmsUrl = `${passthroughBase}?title=${message}&passthroughLink=${encodedPassthrough}`;
  const tokenForTemplate = `${message}&passthroughLink=${encodedPassthrough}`;
  return { tokenForTemplate, fullSmsUrl };
}
async function sendWhatsappTemplate(
  toPhone: string,
  vars: Record<string, string>
): Promise<string | null> {
  const cfg = getTwilioConfig();
  const accountSid = cfg.TWILIO_ACCOUNT_SID;
  const authToken = cfg.TWILIO_AUTH_TOKEN;
  const fromRaw = cfg.TWILIO_WHATSAPP_FROM;
  const cc = cfg.WHATSAPP_COUNTRY_CODE;
  const contentSid = cfg.TWILIO_CONTENT_SID || "";
  if (!accountSid) throw new Error("TWILIO_ACCOUNT_SID is not set");
  if (!authToken) throw new Error("TWILIO_AUTH_TOKEN is not set");
  if (!fromRaw) throw new Error("TWILIO_WHATSAPP_FROM is not set");
  if (!contentSid) throw new Error("TWILIO_CONTENT_SID is not set");
  const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = "Basic " + btoa(`${accountSid}:${authToken}`);
  const to = ensureWhatsappPrefix(toPhoneToE164(toPhone, cc));
  const from = ensureWhatsappPrefix(fromRaw);
  const form = new URLSearchParams();
  form.set("To", to);
  form.set("From", from);
  form.set("ContentSid", contentSid);
  form.set("ContentVariables", JSON.stringify(vars));
  if (cfg.TWILIO_STATUS_CALLBACK_URL)
    form.set("StatusCallback", cfg.TWILIO_STATUS_CALLBACK_URL);
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const txt = await res.text();
  if (!res.ok)
    throw new Error(`Twilio WhatsApp send failed: ${res.status} ${txt}`);
  try {
    const j = JSON.parse(txt);
    return j?.sid ?? null;
  } catch {
    return null;
  }
}
async function sendSmsUrl(toPhone: string, bodyText: string): Promise<void> {
  const cfg = getTwilioConfig();
  const accountSid = cfg.TWILIO_ACCOUNT_SID;
  const authToken = cfg.TWILIO_AUTH_TOKEN;
  const msid = cfg.TWILIO_MESSAGING_SERVICE_SID;
  const smsFrom = cfg.TWILIO_SMS_FROM;
  if (!accountSid || !authToken) throw new Error("Twilio credentials missing");
  if (!msid && !smsFrom)
    throw new Error(
      "Provide TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM for SMS"
    );
  const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = "Basic " + btoa(`${accountSid}:${authToken}`);
  const to = toPhoneToE164(toPhone, cfg.WHATSAPP_COUNTRY_CODE);
  const form = new URLSearchParams();
  form.set("To", to);
  if (msid) form.set("MessagingServiceSid", msid);
  if (!msid && smsFrom) form.set("From", smsFrom);
  form.set("Body", bodyText);
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok)
    throw new Error(
      `Twilio SMS send failed: ${res.status} ${await res.text()}`
    );
}
// ---------- Public API
export async function sendVerificationWhatsAppAndSms(args: {
  admin: any;
  fullName: string;
  phone: string;
  email: string;
}): Promise<void> {
  const { admin, fullName, phone, email } = args;
  // 1) Generate invite to get the hashed token
  const site = (getAppConfig().SITE_URL || "").replace(/\/+$/, "");
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${site}/account/sign-up` },
  } as any);
  if (error) throw new Error(error.message);
  const tokenHash = (data as any)?.properties?.hashed_token as
    | string
    | undefined;
  if (!tokenHash) throw new Error("Could not obtain invite token");
  // 2) Build token variable and SMS URL (exact format)
  const { tokenForTemplate, fullSmsUrl } = buildTokenAndSmsUrl(tokenHash);
  const smsBodyText =
    `MotionAds\n\nHi ${fullName},\n` +
    `Please finish setting up your account by verifying your email:\n${fullSmsUrl}\n\n` +
    `Thanks,\nThe MotionAds Team`;
  // 3) Try WhatsApp first; if API call fails immediately, send SMS now.
  //    If WhatsApp is accepted (SID returned) but later undelivered, the
  //    twillio-callback function will send the SMS using this stored row.
  //    In local development DRY_RUN mode, only record the fallback row and do not send anything.
  const DRY_RUN = getEnvBool("TWILIO_DRY_RUN") || getEnvBool("LOCAL_NO_TWILIO");
  if (DRY_RUN) {
    const drySid = `dryrun-${crypto.randomUUID()}`;
    try {
      await admin
        .from("twilio_message_fallback")
        .insert({ message_sid: drySid, to_e164: phone, sms_body: smsBodyText });
      console.log("[twilio.service] DRY_RUN: recorded fallback only", {
        drySid,
        to: phone,
      });
    } catch (e) {
      console.warn(
        "[twilio.service] DRY_RUN: failed to record fallback row",
        (e as any)?.message
      );
    }
    return;
  }
  try {
    const sid = await sendWhatsappTemplate(phone, {
      name: fullName,
      token: tokenForTemplate,
    });
    if (sid) {
      try {
        await admin
          .from("twilio_message_fallback")
          .insert({ message_sid: sid, to_e164: phone, sms_body: smsBodyText });
      } catch (e) {
        console.warn(
          "[twilio.service] failed to record fallback row",
          (e as any)?.message
        );
      }
    }
  } catch (_) {
    // Immediate WA API failure: fall back to SMS unless in DRY_RUN
    const cfg = getTwilioConfig();
    if (!cfg.TWILIO_DRY_RUN) {
      await sendSmsUrl(phone, smsBodyText);
    } else {
      console.log("[twilio.service] DRY_RUN: skipped immediate SMS fallback", {
        to: phone,
      });
    }
  }
}
// Back-compat wrappers so existing callers continue to work
export async function sendRegistrationWhatsAppAndFallback(args: {
  admin: any;
  fullName: string;
  phone: string;
  email: string;
  passwordResetRedirect: string;
}): Promise<void> {
  const { admin, fullName, phone, email } = args;
  await sendVerificationWhatsAppAndSms({ admin, fullName, phone, email });
}
export async function sendInviteWhatsAppAndFallback(args: {
  admin: any;
  fullName: string;
  phone: string;
  email: string;
}): Promise<void> {
  const { admin, fullName, phone, email } = args;
  await sendVerificationWhatsAppAndSms({ admin, fullName, phone, email });
}

// Compatibility export for twillio-callback which imports sendSms(to, body)
export async function sendSms(toPhone: string, body: string): Promise<void> {
  const DRY_RUN = getEnvBool("TWILIO_DRY_RUN") || getEnvBool("LOCAL_NO_TWILIO");
  if (DRY_RUN) {
    console.log("[twilio.service] DRY_RUN: skipped sendSms", { to: toPhone });
    return;
  }
  const cfg = getTwilioConfig();
  await sendSmsUrl(toPhone, body);
}
