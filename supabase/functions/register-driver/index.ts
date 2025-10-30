// deno-lint-ignore-file no-explicit-any
// Supabase Edge Runtime typings
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RegisterDriverRequest, ResponseStatuses } from "../_shared/models.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { sendRegistrationWhatsAppAndFallback } from "./services/twillio.service.ts";
import { getAppConfig, getSupabaseConfig } from "../_shared/config.ts";
import { existingUser } from "./helper-functions/existing-user.ts";
import { getDriverRoleId } from "./helper-functions/get-driver-role-id.ts";

// Use ResponseStatuses from models.ts for consistent responses

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        Message: "Method not allowed",
        HasErrors: true,
        Error: "method_not_allowed",
      }),
      ResponseStatuses.BadRequest
    );
  }

  try {
    const payload = await req.json();
    const parsed = RegisterDriverRequest.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          Message: "Please check the form inputs.",
          HasErrors: true,
          Error: "validation_error",
          ErrorList: parsed.error.issues as unknown as unknown[],
        }),
        ResponseStatuses.BadRequest
      );
    }
    const { email, fullName, phone, password } = parsed.data;

    const { SUPABASE_URL, SERVICE_ROLE_KEY } = getSupabaseConfig();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const userExists = await existingUser(admin, email, phone);

    if (!userExists || userExists.HasErrors) {
      return new Response(
        JSON.stringify({
          Message: userExists.Message,
          HasErrors: true,
          Error: userExists.Error ?? userExists.Message,
        }),
        ResponseStatuses.BadRequest
      );
    }

    // 0b) Check Airtable for existing user via edge function (admin/service auth)
    const { data: airtableCheck, error: airtableInvokeError } =
      await admin.functions.invoke("airtable-check", {
        body: { email, phone },
      });

    if (airtableInvokeError) {
      return new Response(
        JSON.stringify({
          Message: "There was an error checking Airtable",
          HasErrors: true,
          Error: airtableInvokeError.message,
        }),
        ResponseStatuses.ServerError
      );
    }

    if (airtableCheck?.HasErrors) {
      return new Response(
        JSON.stringify({
          Message: "There was an error checking Airtable",
          HasErrors: true,
          Error: airtableCheck?.Error ?? "airtable_check_failed",
        }),
        ResponseStatuses.ServerError
      );
    }

    if (airtableCheck?.Data?.exists === true) {
      return new Response(
        JSON.stringify({
          Message:
            "You are already registered on the current Motion Ads system and cannot register here again yet. This option will be available soon.",
          HasErrors: true,
          Error: "airtable_duplicate",
          ErrorList: [
            {
              sourceTable:
                airtableCheck?.Data?.table ?? airtableCheck?.Data?.sourceTable,
              sourceTableId: airtableCheck?.Data?.tableId,
              matchedBy: airtableCheck?.Data?.by,
              recordIds: airtableCheck?.Data?.recordIds,
            },
          ],
        }),
        ResponseStatuses.BadRequest
      );
    }

    // 1) Sign up user using admin client WITHOUT triggering email confirmation
    const { data: signUpResult, error: signUpError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          phone_number: phone,
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
      return new Response(
        JSON.stringify({
          Message: message,
          HasErrors: true,
          Error: looksLikeDuplicate ? "auth_duplicate" : "signup_failed",
        }),
        looksLikeDuplicate
          ? ResponseStatuses.BadRequest
          : ResponseStatuses.ServerError
      );
    }

    const userId = signUpResult.user.id;

    // 2) Ensure driver role and insert into public.users
    const driverRole = await getDriverRoleId(admin, "driver");

    if (!driverRole || driverRole.HasErrors || !driverRole.Data) {
      return new Response(
        JSON.stringify({
          Message: "There was an error checking ",
          HasErrors: true,
          Error: driverRole.Error ?? driverRole.Message,
        }),
        ResponseStatuses.BadRequest
      );
    }

    const driverRoleId = driverRole.Data;

    const { error: upsertError } = await admin.from("users").upsert(
      {
        id: userId,
        email,
        display_name: fullName,
        role_id: driverRoleId,
        phone_number: phone,
        profile_completed: false,
        documents_uploaded: false,
      },
      { onConflict: "id" }
    );
    if (upsertError) {
      return new Response(
        JSON.stringify({
          Message: "Could not create driver profile. Please try again.",
          HasErrors: true,
          Error: "profile_create_failed",
        }),
        ResponseStatuses.ServerError
      );
    }

    // 3) Trigger password reset email and send WhatsApp (with fallback record)
    const { PASSWORD_RESET_REDIRECT } = getAppConfig();
    const passwordResetUrl = PASSWORD_RESET_REDIRECT;
    await sendRegistrationWhatsAppAndFallback({
      admin,
      fullName,
      phone,
      email,
      passwordResetRedirect: passwordResetUrl,
    });

    return new Response(
      JSON.stringify({
        Message: "Driver registered. Confirmation link sent.",
        HasErrors: false,
      }),
      ResponseStatuses.Ok
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        Message: err?.message ?? "Unexpected error",
        HasErrors: true,
        Error: "unexpected_error",
      }),
      ResponseStatuses.ServerError
    );
  }
});
