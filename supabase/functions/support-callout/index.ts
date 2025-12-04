// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { FunctionResponseType, ResponseStatuses } from "../_shared/models.ts";
import { SupportSchema, SupportPayload } from "../_shared/support.ts";

function sanitizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return digits;
}

function buildWhatsAppLink(phone: string, text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
}

const GENERIC_USER_ERROR =
  "We could not start the WhatsApp chat. Please try again or contact support.";

function errorResponse(message: string, status: keyof typeof ResponseStatuses) {
  const body: FunctionResponseType = {
    HasErrors: true,
    Message: GENERIC_USER_ERROR,
    Error: message,
    ErrorList: [],
    Data: null,
  };
  return new Response(JSON.stringify(body), ResponseStatuses[status]);
}

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
      return new Response("ok", ResponseStatuses.Ok);
    }
    
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", "BadRequest");
  }

  let parsed:
    | { success: true; data: SupportPayload }
    | { success: false; error: any };
  try {
    const body = await req.json();
    parsed = SupportSchema.safeParse(body);
  } catch {
    return errorResponse("Invalid JSON payload.", "BadRequest");
  }

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i: { message: string }) => i.message)
      .join("; ");
    return errorResponse(message, "BadRequest");
  }

  const payload = parsed.data;

  const supportPhone = sanitizePhone(payload.supportPhoneNumber);

  if (!supportPhone) {
    return errorResponse("Invalid support phone number provided.", "BadRequest");
  }

  const lines = [
    payload.preMessage || null,
    payload.userMessage,
    payload.name ? `Name: ${payload.name}` : null,
    payload.motionId ? `Motion ID: ${payload.motionId}` : null,
    payload.userEmail ? `Driver email: ${payload.userEmail}` : null,
    payload.sourceTag ? `Source: ${payload.sourceTag}` : null,
  ].filter(Boolean);

  const text = lines.join("\n");
  const link = buildWhatsAppLink(supportPhone, text);

  const resp: FunctionResponseType & { Link?: string } = {
    HasErrors: false,
    Message: "WhatsApp link created.",
    Error: undefined,
    ErrorList: [],
    Data: { link, supportPhone },
    Link: link,
  };

  return new Response(JSON.stringify(resp), ResponseStatuses.Ok);
});
