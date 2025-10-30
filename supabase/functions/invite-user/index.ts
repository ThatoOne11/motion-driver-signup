// Supabase Edge Runtime typings
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendInviteWhatsAppAndFallback } from "../register-driver/services/twillio.service.ts";
import { jwtDecode, JwtPayload } from "https://esm.sh/jwt-decode@4.0.0";
import {
  InviteUserRequest,
  ResponseObject,
  ResponseStatuses,
} from "../_shared/models.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", ResponseStatuses.Ok);
  }
  if (req.method !== "POST") {
    const res = ResponseObject.parse({
      Message: "Method not allowed",
      HasErrors: true,
      Error: "method_not_allowed",
    });
    return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
  }

  try {
    // Verify caller's JWT role (admin or super-admin)
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      const res = ResponseObject.parse({
        Message: "Missing Authorization header",
        HasErrors: true,
        Error: "unauthorized",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.Unauthorised);
    }
    const token = authHeader.split(" ")[1];
    let roleClaim: string | undefined;
    try {
      const decoded = jwtDecode<JwtPayload & { user_role?: string }>(token);
      roleClaim = decoded.user_role || (decoded as any)["user_role"];
    } catch {
      const res = ResponseObject.parse({
        Message: "Invalid Authorization token",
        HasErrors: true,
        Error: "unauthorized",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.Unauthorised);
    }
    const allowed = ["admin", "super-admin", "superadmin"];
    if (!roleClaim || !allowed.includes(roleClaim)) {
      const res = ResponseObject.parse({
        Message: "You do not have permission to perform this action.",
        HasErrors: true,
        Error: "unauthorized",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.Unauthorised);
    }
    const payload = await req.json();
    const parsed = InviteUserRequest.safeParse(payload);
    if (!parsed.success) {
      const res = ResponseObject.parse({
        Message: "Please check the form inputs.",
        HasErrors: true,
        Error: "validation_error",
        ErrorList: parsed.error.issues as unknown as any[],
      });
      return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
    }
    const { email, phoneNumber, displayName, role } = parsed.data;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      const res = ResponseObject.parse({
        Message: "Server configuration is incomplete. Please contact support.",
        HasErrors: true,
        Error: "server_config_error",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Uniqueness checks in app profile table BEFORE sending invite
    const { data: emailRow, error: emailErr } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (emailErr) {
      const res = ResponseObject.parse({
        Message: "Could not verify email uniqueness. Please try again.",
        HasErrors: true,
        Error: "profile_lookup_failed",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }
    if (emailRow) {
      const res = ResponseObject.parse({
        Message:
          "An account with this email already exists. Try signing in or use a different email.",
        HasErrors: true,
        Error: "email_exists_profile",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
    }

    const { data: phoneRow, error: phoneErr } = await admin
      .from("users")
      .select("id")
      .eq("phone_number", phoneNumber)
      .maybeSingle();
    if (phoneErr) {
      const res = ResponseObject.parse({
        Message: "Could not verify phone uniqueness. Please try again.",
        HasErrors: true,
        Error: "profile_lookup_failed",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }
    if (phoneRow) {
      const res = ResponseObject.parse({
        Message:
          "This phone number is already registered. Please use a different number or sign in.",
        HasErrors: true,
        Error: "phone_exists_profile",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
    }

    // Check Airtable for existing user (service-role call)
    const { data: airtableCheck, error: airtableErr } =
      await admin.functions.invoke("airtable-check", {
        body: { email, phone: phoneNumber },
      });
    if (airtableErr) {
      const res = ResponseObject.parse({
        Message: "There was an error checking Airtable.",
        HasErrors: true,
        Error: airtableErr.message ?? "airtable_check_error",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }
    if (airtableCheck?.HasErrors) {
      const res = ResponseObject.parse({
        Message: "There was an error checking Airtable.",
        HasErrors: true,
        Error: airtableCheck?.Error ?? "airtable_check_failed",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }
    if (airtableCheck?.Data?.exists === true) {
      const res = ResponseObject.parse({
        Message:
          "There is already a record for this user in our system. If they have registered before, ask them to sign in.",
        HasErrors: true,
        Error: "airtable_duplicate",
        ErrorList: [
          {
            sourceTable:
              (airtableCheck as any)?.Data?.table ||
              (airtableCheck as any)?.Data?.sourceTable,
            sourceTableId: (airtableCheck as any)?.Data?.tableId,
            matchedBy: (airtableCheck as any)?.Data?.by,
            recordIds: (airtableCheck as any)?.Data?.recordIds,
          },
        ],
      });
      return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
    }

    // Send invite (creates auth user) with metadata
    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: displayName, phone_number: phoneNumber },
      });
    if (inviteErr || !invited?.user?.id) {
      const msg = inviteErr?.message ?? "Invite failed";
      if (msg.toLowerCase().includes("already registered")) {
        const res = ResponseObject.parse({
          Message:
            "An account with this email already exists. Try signing in or use a different email.",
          HasErrors: true,
          Error: "email_exists_auth",
        });
        return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
      }
      const res = ResponseObject.parse({
        Message: msg,
        HasErrors: true,
        Error: "invite_failed",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }

    const roleId = await ensureRole(admin, role);
    const insert = {
      id: invited.user.id,
      display_name: displayName,
      email,
      role_id: roleId,
      phone_number: phoneNumber,
      registered: false,
    };
    const { error: upsertErr } = await admin
      .from("users")
      .upsert(insert, { onConflict: "id" });
    if (upsertErr) {
      const message = upsertErr.message ?? "Could not create user profile.";
      if (
        message.toLowerCase().includes("users_email_key") ||
        (message.toLowerCase().includes("unique") &&
          message.toLowerCase().includes("email"))
      ) {
        const res = ResponseObject.parse({
          Message: "An account with this email already exists.",
          HasErrors: true,
          Error: "email_exists_profile",
        });
        return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
      }
      if (message.toLowerCase().includes("phone")) {
        const res = ResponseObject.parse({
          Message: "This phone number is already registered.",
          HasErrors: true,
          Error: "phone_exists_profile",
        });
        return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
      }
      const res = ResponseObject.parse({
        Message: "Could not create user profile. Please try again.",
        HasErrors: true,
        Error: "profile_create_failed",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }

    // Send WhatsApp + record SMS fallback with invite link
    try {
      await sendInviteWhatsAppAndFallback({
        admin,
        fullName: displayName,
        phone: phoneNumber,
        email,
      });
    } catch (e) {
      // Do not fail the invite if messaging fails
    }

    const success = ResponseObject.parse({
      Message: "Success",
      HasErrors: false,
      Error: "",
      ErrorList: [],
    });
    return new Response(JSON.stringify(success), ResponseStatuses.Ok);
  } catch (err: any) {
    const res = ResponseObject.parse({
      Message: err?.message ?? "Unexpected error",
      HasErrors: true,
      Error: "unexpected_error",
    });
    return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
  }
});

async function ensureRole(
  admin: any,
  roleName: "admin" | "driver"
): Promise<string> {
  const { data, error } = await admin
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.id) return data.id as string;
  const { data: ins, error: iErr } = await admin
    .from("roles")
    .insert({ name: roleName })
    .select("id")
    .single();
  if (iErr) throw new Error(iErr.message);
  return ins.id as string;
}
