// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseConfig } from "../_shared/config.ts";
import { sendSms } from "../register-driver/services/twillio.service.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const text = await req.text();
  const params = new URLSearchParams(text);
  const messageSid = params.get("MessageSid") ?? params.get("SmsSid") ?? "";
  const messageStatus =
    params.get("MessageStatus") ?? params.get("SmsStatus") ?? "";
  const errorCode = params.get("ErrorCode") ?? "";

  try {
    const { SUPABASE_URL, SERVICE_ROLE_KEY } = getSupabaseConfig();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const failedOrUndelivered = ["undelivered", "failed"].includes(
      (messageStatus || "").toLowerCase()
    );
    const shouldFallback =
      failedOrUndelivered &&
      (errorCode === "63032" || errorCode === "63016" || errorCode === "63016");

    if (shouldFallback && messageSid) {
      const { data: row } = await admin
        .from("twilio_message_fallback")
        .select("to_e164, sms_body, sent")
        .eq("message_sid", messageSid)
        .maybeSingle();
      if (row && !row.sent) {
        try {
          await sendSms(row.to_e164, row.sms_body);
          await admin
            .from("twilio_message_fallback")
            .update({ sent: true })
            .eq("message_sid", messageSid);
          console.log("[twilio-status-callback] SMS fallback sent", {
            requestId,
            messageSid,
          });
        } catch (e) {
          console.error("[twilio-status-callback] SMS fallback failed", {
            requestId,
            messageSid,
            error: (e as any)?.message,
          });
        }
      } else {
        console.warn(
          "[twilio-status-callback] no fallback row or already sent",
          { requestId, messageSid }
        );
      }
    }
  } catch (e: any) {
    console.error("[twilio-status-callback] error", {
      requestId,
      error: e?.message,
    });
  }

  return new Response("OK", { headers: corsHeaders });
});
