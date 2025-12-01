// Supabase Edge Runtime typings
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtDecode, JwtPayload } from "https://esm.sh/jwt-decode@4.0.0";
import {
  InspectorInviteRequest,
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

    const allowed = ["admin", "super-admin"];
    if (!roleClaim || !allowed.includes(roleClaim)) {
      const res = ResponseObject.parse({
        Message: "You do not have permission to perform this action.",
        HasErrors: true,
        Error: "unauthorized",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.Unauthorised);
    }

    const payload = await req.json();
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

    //Inspector Invite Flow (Supports multiple invites)
    const bulkParsed = InspectorInviteRequest.safeParse(payload);
    if (bulkParsed.success) {
      const results = [];
      const { users } = bulkParsed.data;

      for (const user of users) {
        const { email, phoneNumber, displayName, role } = user;
        try {
          const { data: exists } = await admin
            .from("users")
            .select("id")
            .or(`email.eq.${email},phone_number.eq.${phoneNumber}`)
            .maybeSingle();
          if (exists) {
            results.push({
              email,
              success: false,
              error: "User already exists",
            });
            continue;
          }

          const { data: invited, error: inviteErr } =
            await admin.auth.admin.inviteUserByEmail(email, {
              data: {
                full_name: displayName,
                phone_number: phoneNumber,
                user_role: role,
              },
            });

          if (inviteErr || !invited?.user?.id) {
            results.push({
              email,
              success: false,
              error: inviteErr?.message || "Invite failed",
            });
            continue;
          }

          // Create Profile with required fields
          const roleId = await ensureRole(admin, role as any);
          const { error: upsertErr } = await admin.from("users").insert({
            id: invited.user.id,
            display_name: displayName,
            email,
            role_id: roleId,
            phone_number: phoneNumber,
            profile_completed: false,
            documents_uploaded: false,
          });

          if (upsertErr) {
            results.push({ email, success: false, error: upsertErr.message });
          } else {
            results.push({ email, success: true });
          }
        } catch (e: any) {
          results.push({ email, success: false, error: e.message });
        }
      }

      return new Response(
        JSON.stringify({
          Message: "Invite/s processed",
          HasErrors: results.some((r) => !r.success),
          Data: results,
        }),
        ResponseStatuses.Ok
      );
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

async function ensureRole(admin: any, roleName: string): Promise<string> {
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
