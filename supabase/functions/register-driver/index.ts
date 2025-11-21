// deno-lint-ignore-file no-explicit-any
// Supabase Edge Runtime typings
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RegisterDriverRequest, ResponseStatuses } from "../_shared/models.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { sendRegistrationWhatsAppAndFallback } from "./services/twillio.service.ts";
import {
  getAppConfig,
  getSupabaseConfig,
  getTwilioConfig,
} from "../_shared/config.ts";
import { existingUser } from "./helper-functions/existing-user.ts";
import { getDriverRoleId } from "./helper-functions/get-driver-role-id.ts";
import { allocateSuperMotionIdForUser } from "../driver-profile/helper-functions/allocate-motion.ts";
import { normalizePhoneNumber } from "./helper-functions/normalize-phone.ts";

type RegisterDriverResponseBody = {
  Message: string;
  HasErrors: boolean;
  Error?: string;
  ErrorMessage?: string;
  ErrorList?: unknown[];
};

function okResponse(body: RegisterDriverResponseBody) {
  return new Response(JSON.stringify(body), ResponseStatuses.Ok);
}

// Use ResponseStatuses from models.ts for consistent responses

Deno.serve(async (req) => {
  const reqId = crypto.randomUUID();
  console.log("[register-driver] request received", {
    reqId,
    method: req.method,
  });
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.warn("[register-driver] invalid method", {
      reqId,
      method: req.method,
    });
    return okResponse({
      Message: "Method not allowed",
      HasErrors: true,
      Error: "method_not_allowed",
      ErrorMessage: "Method not allowed",
    });
  }

  try {
    const payload = await req.json();
    console.log("[register-driver] payload parsed", {
      reqId,
      hasEmail: Boolean(payload?.email),
      hasFullName: Boolean(payload?.fullName),
      hasPhone: Boolean(payload?.phone),
      inspector: payload?.inspector === true,
    });
    const parsed = RegisterDriverRequest.safeParse(payload);
    if (!parsed.success) {
      console.warn("[register-driver] validation failed", {
        reqId,
        issues: parsed.error.issues,
      });
      return okResponse({
        Message: "Please check the form inputs.",
        HasErrors: true,
        Error: "validation_error",
        ErrorMessage:
          parsed.error.issues?.[0]?.message ??
          "Please ensure all required fields are completed.",
        ErrorList: parsed.error.issues as unknown as unknown[],
      });
    }
    const {
      email,
      fullName,
      phone,
      password,
      inspector,
      inspectorDetails = [],
    } = parsed.data;
    const countryCode = getTwilioConfig().WHATSAPP_COUNTRY_CODE;
    const normalizedPhone = normalizePhoneNumber(phone, countryCode);
    const isInspectorFlow = inspector === true;

    const { SUPABASE_URL, SERVICE_ROLE_KEY } = getSupabaseConfig();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    console.log("[register-driver] payload accepted", {
      reqId,
      email,
      phone: normalizedPhone,
      inspector: isInspectorFlow,
    });

    const userExists = await existingUser(
      admin,
      email,
      normalizedPhone,
      phone,
      countryCode
    );

    if (!userExists || userExists.HasErrors) {
      console.warn("[register-driver] duplicate detected", {
        reqId,
        email,
        phone: normalizedPhone,
      });
      return okResponse({
        Message: userExists.Message,
        HasErrors: true,
        Error: userExists.Error ?? "duplicate",
        ErrorMessage: userExists.Message,
      });
    }

    // 0b) Check Airtable for existing user via edge function (admin/service auth)
    if (isInspectorFlow && inspectorDetails.length === 0) {
      console.warn("[register-driver] inspector flow missing details", {
        email,
      });
    }

    if (!isInspectorFlow) {
      const { data: airtableCheck, error: airtableInvokeError } =
        await admin.functions.invoke("airtable-check", {
          body: { email, phone: normalizedPhone },
        });

      if (airtableInvokeError) {
        console.error("[register-driver] airtable invoke failed", {
          reqId,
          error: airtableInvokeError.message,
        });
        return okResponse({
          Message: "There was an error checking Airtable",
          HasErrors: true,
          Error: airtableInvokeError.message,
          ErrorMessage:
            "We could not verify your details at this time. Please try again.",
        });
      }

      if (airtableCheck?.HasErrors) {
        console.error("[register-driver] airtable check returned error", {
          reqId,
          error: airtableCheck?.Error,
        });
        return okResponse({
          Message: "There was an error checking Airtable",
          HasErrors: true,
          Error: airtableCheck?.Error ?? "airtable_check_failed",
          ErrorMessage:
            "We could not verify your details at this time. Please try again.",
        });
      }

      if (airtableCheck?.Data?.exists === true) {
        console.warn("[register-driver] airtable duplicate", {
          reqId,
          email,
          phone: normalizedPhone,
          source: airtableCheck?.Data,
        });
        return okResponse({
          Message:
            "You are already registered on the current Motion Ads system and cannot register here again yet. This option will be available soon.",
          HasErrors: true,
          Error: "airtable_duplicate",
          ErrorMessage:
            "You are already registered on the current Motion Ads system and cannot register again yet.",
          ErrorList: [
            {
              sourceTable:
                airtableCheck?.Data?.table ?? airtableCheck?.Data?.sourceTable,
              sourceTableId: airtableCheck?.Data?.tableId,
              matchedBy: airtableCheck?.Data?.by,
              recordIds: airtableCheck?.Data?.recordIds,
            },
          ],
        });
      }
    }

    // 1) Sign up user using admin client WITHOUT triggering email confirmation
    const { data: signUpResult, error: signUpError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          phone_number: normalizedPhone,
        },
      });

    if (signUpError || !signUpResult?.user?.id) {
      const raw = signUpError?.message?.toLowerCase?.() ?? "";
      const looksLikeDuplicate =
        raw.includes("already registered") ||
        (raw.includes("already") && raw.includes("register")) ||
        raw.includes("exists") ||
        raw.includes("duplicate") ||
        raw.includes("email") ||
        raw.includes("user");
      const message = looksLikeDuplicate
        ? "You are already registered on our system with these details. Please log in instead."
        : (signUpError?.message ?? "Failed to register driver");
      console.warn("[register-driver] auth create user failed", {
        reqId,
        email,
        phone: normalizedPhone,
        error: signUpError?.message,
      });
      return okResponse({
        Message: message,
        HasErrors: true,
        Error: looksLikeDuplicate ? "auth_duplicate" : "signup_failed",
        ErrorMessage: message,
      });
    }

    const userId = signUpResult.user.id;
    console.log("[register-driver] auth user created", { reqId, userId });

    // 2) Ensure driver role and insert into public.users
    const driverRole = await getDriverRoleId(admin, "driver");

    if (!driverRole || driverRole.HasErrors || !driverRole.Data) {
      console.error("[register-driver] unable to resolve driver role", {
        reqId,
        error: driverRole?.Error ?? driverRole?.Message,
      });
      return okResponse({
        Message: "There was an error checking driver role.",
        HasErrors: true,
        Error: driverRole.Error ?? driverRole.Message ?? "role_error",
        ErrorMessage:
          "Unable to assign a driver role at this time. Please try again later.",
      });
    }

    const driverRoleId = driverRole.Data;

    const inspectorRecord = inspectorDetails?.[0];

    const { error: upsertError } = await admin.from("users").upsert(
      {
        id: userId,
        email,
        display_name: fullName,
        role_id: driverRoleId,
        phone_number: normalizedPhone,
        profile_completed: isInspectorFlow ? true : false,
        documents_uploaded: isInspectorFlow ? true : false,
        airtable_record_id: inspectorRecord?.airtableRecordId,
        airtable_motion_id: inspectorRecord?.motionId,
      },
      { onConflict: "id" }
    );
    if (upsertError) {
      console.error("[register-driver] profile upsert failed", {
        reqId,
        userId,
        error: upsertError.message,
      });
      return okResponse({
        Message: "Could not create driver profile. Please try again.",
        HasErrors: true,
        Error: "profile_create_failed",
        ErrorMessage:
          "We could not finish creating your profile. Please try again.",
      });
    }

    console.log("[register-driver] profile row created", { reqId, userId });

    if (isInspectorFlow) {
      // deno-lint-ignore no-unused-vars
      let allocatedSuperMotionId: string | null = null;

      try {
        allocatedSuperMotionId = await allocateSuperMotionIdForUser(
          admin,
          userId
        );
      } catch (motionError) {
        console.error("[register-driver] super motion allocation failed", {
          userId,
          error: (motionError as Error).message,
        });
      }
    }

    // 3) Trigger password reset email and send WhatsApp (with fallback record)
    const { PASSWORD_RESET_REDIRECT } = getAppConfig();
    const passwordResetUrl = PASSWORD_RESET_REDIRECT;
    await sendRegistrationWhatsAppAndFallback({
      admin,
      fullName,
      phone: normalizedPhone,
      email,
      passwordResetRedirect: passwordResetUrl,
    });

    console.log("[register-driver] registration finished", { reqId, userId });

    return okResponse({
      Message: "Driver registered. Confirmation link sent.",
      HasErrors: false,
    });
  } catch (err: any) {
    console.error("[register-driver] unhandled error", {
      error: err?.message,
      stack: err?.stack,
    });
    return new Response(
      JSON.stringify({
        Message: err?.message ?? "Unexpected error",
        HasErrors: true,
        Error: "unexpected_error",
        ErrorMessage: "An unexpected error occurred. Please try again later.",
      }),
      ResponseStatuses.ServerError
    );
  }
});
