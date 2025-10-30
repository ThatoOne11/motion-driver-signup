// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseConfig } from "../_shared/config.ts";
import {
  AIRTABLE_FIELDS,
  AIRTABLE_READONLY_FIELD_IDS,
  AIRTABLE_DRIVER_ID_FIELD_ID,
} from "./config/airtable.config.ts";
import { DriverProfileSchema } from "./config/schema.ts";
import {
  createRecord,
  getRecordFields,
  createRecordInTable,
  type AirtableServiceResult,
} from "./services/airtable.service.ts";
import { AIRTABLE_USERS_FIELDS } from "./config/airtable.config.ts";
import { buildAirtableFields } from "./lib/build-airtable-fields.ts";
import { resolveLookupNames } from "./lib/resolve-lookups.ts";
import { normalizePhoneZA } from "./helper-functions/normalize-phone.ts";
import { allocateSuperMotionIdForUser } from "./helper-functions/allocate-motion.ts";
import {
  preUpdateUserDetails,
  saveAirtableRefs,
  finalizeProfileCompleted,
} from "./helper-functions/users-persisters.ts";
import { getAuthUser } from "../_shared/auth/auth-user.service.ts";
import {
  ResponseObject,
  ResponseStatuses,
  MotionDriverResponseObject,
} from "../_shared/models.ts";

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    const res = ResponseObject.parse({
      Message: "Method not allowed",
      HasErrors: true,
      Error: "method_not_allowed",
    });
    return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
  }

  const reqId = crypto.randomUUID();
  console.log("[driver-profile] start", { reqId });
  try {
    const requestBody = await req.json();
    console.log("[driver-profile] payload received", {
      reqId,
      keys: Object.keys(requestBody ?? {}),
    });
    const parsed = DriverProfileSchema.safeParse(requestBody);
    if (!parsed.success) {
      console.warn("[driver-profile] validation failed", {
        reqId,
        issues: parsed.error.issues,
      });
      const res = ResponseObject.parse({
        Message: "Invalid form inputs",
        HasErrors: true,
        Error: parsed.error.issues,
      });
      return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
    }

    const profileInput = parsed.data;

    // Supabase admin client (service role) to persist data and allocate motion id
    const { SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY } = getSupabaseConfig();
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    });

    const authUser = await getAuthUser(supabaseUser, reqId);

    if (authUser.HasErrors || !authUser.userId) {
      console.warn("There was an error fetching the authenticated user");
      const res = ResponseObject.parse({
        Message: "Issue fetching the auth user",
        HasErrors: true,
        Error: "auth user error",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }
    const currentUserId = authUser.userId;

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("phone_number")
      .eq("id", currentUserId)
      .maybeSingle();
    const normalizedPhone = normalizePhoneZA(userRow?.phone_number);
    const finalPhone =
      normalizedPhone ?? normalizePhoneZA(((profileInput as any) ?? {}).phone);
    console.log("[driver-profile] phone resolution", {
      reqId,
    });

    // 4.2 Allocate Super Motion ID (idempotent)
    let motionId: string;
    try {
      motionId = await allocateSuperMotionIdForUser(
        supabaseAdmin,
        currentUserId
      );
    } catch (motionIdError: any) {
      console.error("[driver-profile] motion id error", {
        reqId,
        error: motionIdError.message,
      });
      const res = ResponseObject.parse({
        Message: "Error assigning the driver a motion id",
        HasErrors: true,
        Error: motionIdError.message,
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }
    console.log("[driver-profile] motion id allocated", { reqId, motionId });

    // 4.3 Persist minimal profile data (do not mark profile_completed yet)
    try {
      await preUpdateUserDetails(
        supabaseAdmin,
        currentUserId,
        profileInput.fullName,
        finalPhone
      );
    } catch (updateUserError: any) {
      console.error("[driver-profile] user update failed", {
        reqId,
        error: updateUserError.message,
      });
      const res = ResponseObject.parse({
        Message: "user update failed",
        HasErrors: true,
        Error: updateUserError.message,
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }

    // 4.4 Resolve select option names and build Airtable payload
    const resolvedNames = await resolveLookupNames(supabaseAdmin, profileInput);
    // Revert to sending E.164 +27 format to Airtable
    const airtablePhone =
      finalPhone ?? normalizePhoneZA(((profileInput as any) ?? {}).phone);
    const inputWithPhone = {
      ...profileInput,
      phone: airtablePhone,
    } as any;
    const airtableFields = buildAirtableFields(
      AIRTABLE_FIELDS,
      inputWithPhone,
      motionId,
      resolvedNames
    );
    // Omit any configured read-only/computed field IDs from writes
    for (const roId of AIRTABLE_READONLY_FIELD_IDS) {
      if (roId in airtableFields) {
        delete airtableFields[roId];
      }
    }

    // 4.5 Insert a new Airtable record only (no upsert/update/duplicate checks here)
    const createRes: AirtableServiceResult = await createRecord(airtableFields);
    if (createRes.HasErrors) {
      console.error("[driver-profile] airtable create failed", {
        reqId,
        error: createRes.Error,
      });
      const res = ResponseObject.parse({
        Message: "airtable create failed",
        HasErrors: true,
        Error: createRes.Error,
      });
      return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
    }
    const airtableRecordId = createRes.recordId;

    let computedAirtableFields: Record<string, any> | undefined = undefined;
    if (airtableRecordId) {
      // Read back the record to capture computed/auto fields (e.g., auto-number Driver ID)
      const fetchRes = await getRecordFields(airtableRecordId);
      if (fetchRes.HasErrors) {
        console.warn("[driver-profile] could not fetch computed fields", {
          reqId,
          error: fetchRes.Error,
        });
      } else {
        computedAirtableFields = fetchRes.fields;
      }
      const driverIdValue =
        computedAirtableFields?.[AIRTABLE_DRIVER_ID_FIELD_ID];
      try {
        await saveAirtableRefs(supabaseAdmin, currentUserId, {
          airtableRecordId,
          airtableMotionId: driverIdValue ?? undefined,
        });
      } catch (saveErr: any) {
        console.error("[driver-profile] failed to persist airtable ids", {
          reqId,
          error: saveErr.message,
        });
      }
    }

    try {
      const usersTableId = Deno.env.get("AIRTABLE_USERS_TABLE_ID");
      if (usersTableId) {
        const usersFields: Record<string, any> = {};
        usersFields[AIRTABLE_USERS_FIELDS.fullName] = profileInput.fullName;
        usersFields[AIRTABLE_USERS_FIELDS.email] =
          profileInput.email.toLowerCase();
        // Use finalPhone in +27 format when available
        const phoneForUsers = (
          finalPhone ??
          (profileInput as any)?.phone ??
          ""
        ).toString();
        if (phoneForUsers) {
          usersFields[AIRTABLE_USERS_FIELDS.phone] = phoneForUsers;
        }
        usersFields[AIRTABLE_USERS_FIELDS.city] =
          (resolvedNames as any).cityName ?? "";

        console.log("[driver-profile] creating airtable-users", {
          reqId,
          usersTableId,
        });
        const usersRes = await createRecordInTable(usersTableId, usersFields);
        if (usersRes.HasErrors) {
          console.warn("[driver-profile] airtable-users create failed", {
            reqId,
            error: usersRes.Error,
          });
          const res = ResponseObject.parse({
            Message: "airtable-users create failed",
            HasErrors: true,
            Error: usersRes.Error,
          });
          return new Response(
            JSON.stringify(res),
            ResponseStatuses.ServerError
          );
        } else {
          console.log("[driver-profile] airtable-users success", {
            reqId,
            recordId: usersRes.recordId,
          });
          // Mark profile complete only after users record succeeds
          try {
            await finalizeProfileCompleted(supabaseAdmin, currentUserId);
          } catch (finalizeErr: any) {
            console.error(
              "[driver-profile] finalize profile_completed failed",
              { reqId, error: finalizeErr.message }
            );
            const res = ResponseObject.parse({
              Message: "finalize profile_completed failed",
              HasErrors: true,
              Error: finalizeErr.message,
            });
            return new Response(
              JSON.stringify(res),
              ResponseStatuses.ServerError
            );
          }
        }
      } else {
        console.warn(
          "[driver-profile] AIRTABLE_USERS_TABLE_ID not set; skipping users table create",
          { reqId }
        );
      }
    } catch (e) {
      console.warn("[driver-profile] airtable-users flow error (non-fatal)", {
        reqId,
        error: (e as Error).message,
      });
    }

    const res = MotionDriverResponseObject.parse({
      Message: "driver-profile prepared",
      HasErrors: false,
      motionId,
      airtableRecordId,
    });
    return new Response(JSON.stringify(res), ResponseStatuses.Ok);
  } catch (serverError) {
    console.error("[driver-profile] unhandled error", {
      reqId,
      error: (serverError as Error).message,
    });
    const res = ResponseObject.parse({
      Message: "server error - unhandled error",
      HasErrors: true,
      Error: (serverError as Error).message,
    });
    return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
  }
});
