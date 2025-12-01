// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { ResponseStatuses } from "../_shared/models.ts";
import { getSupabaseConfig } from "../_shared/config.ts";
import { sendPasswordResetWhatsAppAndSms } from "../register-driver/services/twillio.service.ts";

const PasswordResetRequest = z.object({
  phone: z
    .string()
    .regex(/^0\d{9}$/, "Phone must start with 0 and be 10 digits"),
});

const defaultSuccessMessage =
  "If the account exists, a password reset link has been sent via WhatsApp/SMS.";

function jsonResponse(body: Record<string, unknown>, init: ResponseInit) {
  return new Response(JSON.stringify(body), init);
}

function okResponse(body: Record<string, unknown>) {
  return jsonResponse(body, ResponseStatuses.Ok);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return okResponse({
      Message: "Method not allowed",
      HasErrors: true,
      Error: "method_not_allowed",
    });
  }

  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const parsed = PasswordResetRequest.safeParse(payload);
    if (!parsed.success) {
      return okResponse({
        Message: "Please provide a valid phone number.",
        HasErrors: true,
        Error: "validation_error",
        ErrorList: parsed.error.issues as unknown as unknown[],
      });
    }

    const phone = parsed.data.phone.trim();
    const localPhone = phone; // e.g., 082... (what the UI collects)
    const internationalPhone = `+27${localPhone.slice(1)}`; // e.g., +2782...
    const { SUPABASE_URL, SERVICE_ROLE_KEY } = getSupabaseConfig();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: userRow, error: userError } = await admin
      .from("users")
      .select("display_name, phone_number, email")
      .in("phone_number", [localPhone, internationalPhone])
      .maybeSingle();

    if (userError) {
      console.error("[password-reset] user lookup failed", {
        error: userError.message,
      });
      return okResponse({
        Message: "There was an error processing your request.",
        HasErrors: true,
        Error: "profile_lookup_failed",
      });
    }

    if (!userRow?.phone_number || !userRow?.email) {
      return okResponse({
        Message: "No account found for that phone number.",
        HasErrors: true,
        Error: "not_found",
      });
    }

    try {
      await sendPasswordResetWhatsAppAndSms({
        admin,
        email: userRow.email,
        phone: userRow.phone_number,
        fullName: userRow.display_name || userRow.email,
      });
    } catch (sendError) {
      console.error("[password-reset] failed to dispatch Twilio message", {
        error: (sendError as Error).message,
      });
      return okResponse({
        Message:
          "We could not send the password reset link. Please try again later.",
        HasErrors: true,
        Error: "send_failed",
      });
    }

    return okResponse({
      Message: defaultSuccessMessage,
      HasErrors: false,
    });
  } catch (err) {
    console.error("[password-reset] unexpected error", {
      error: (err as Error)?.message,
    });
    return okResponse({
      Message: "Unexpected error. Please try again.",
      HasErrors: true,
      Error: "unexpected_error",
    });
  }
});
