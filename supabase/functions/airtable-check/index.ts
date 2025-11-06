// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { ResponseStatuses } from "../_shared/models.ts";
import {
  normalizeEmail,
  normalizePhoneZA,
  phoneDigits,
} from "./helper-functions/normalize.ts";
import { authorizeRequest } from "./helper-functions/auth.ts";
import {
  buildUsersFormula,
  buildDriversFormula,
} from "./helper-functions/formulas.ts";
import { queryByFormula } from "./services/airtable-query.service.ts";

type CheckRequest = {
  email?: string;
  phone?: string;
};

type CheckResult = {
  exists: boolean;
  by?: "email" | "phone";
  table?: "users" | "drivers";
  recordIds?: string[];
  normalized: { email?: string; phone?: string };
};

// normalization helpers moved to helper-functions/normalize.ts

function getAirtableEnv() {
  const token = Deno.env.get("AIRTABLE_ACCESS_TOKEN");
  const appId = Deno.env.get("AIRTABLE_APP_ID");
  const usersTableId = Deno.env.get("AIRTABLE_USERS_TABLE_ID");
  const driversTableId = Deno.env.get("AIRTABLE_DRIVERS_TABLE_ID");
  if (!token || !appId) {
    throw new Error(
      "Missing Airtable env: AIRTABLE_ACCESS_TOKEN / AIRTABLE_APP_ID"
    );
  }
  const baseUrl = (tid: string) =>
    `https://api.airtable.com/v0/${appId}/${tid}`;
  return { token, usersTableId, driversTableId, baseUrl };
}

// auth helper moved to helper-functions/auth.ts

// airtable query moved to services/airtable-query.service.ts

function escapeAirtableString(v: string) {
  // Escape single quotes inside Airtable formulas
  return v.replace(/'/g, "\\'");
}

Deno.serve(async (req) => {
  const reqId = crypto.randomUUID();
  const LOG = (Deno.env.get("LOG_AIRTABLE_CHECK") ?? "1") === "1";
  const log = (...args: any[]) => {
    if (LOG) console.log("[airtable-check]", reqId, ...args);
  };
  log("start");
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

  const authResult = authorizeRequest(req);
  if (authResult.HasErrors) {
    log("unauthorized");
    return new Response(
      JSON.stringify({
        Message: authResult.Message,
        HasErrors: true,
        Error: authResult.Error ?? "unauthorized",
      }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = (await req.json()) as CheckRequest;
    const emailN = normalizeEmail(body.email);
    const phoneN = normalizePhoneZA(body.phone);
    const phoneD = phoneDigits(phoneN ?? body.phone);
    log("inputs", { raw: body, normalized: { emailN, phoneN, phoneD } });

    if (!emailN && !phoneD) {
      log("missing_identifiers");
      return new Response(
        JSON.stringify({
          Message: "Email or phone required",
          HasErrors: true,
          Error: "missing_identifiers",
        }),
        ResponseStatuses.BadRequest
      );
    }

    // Optional local/testing bypass using bypass.json when AIRTABLE_BYPASS=1
    const bypassEnabled = (Deno.env.get("AIRTABLE_BYPASS") ?? "0") === "1";
    if (bypassEnabled) {
      try {
        const json = (
          await import("./lib/bypass.json", {
            assert: { type: "json" },
          })
        ).default as {
          emails?: string[];
          phone?: string[];
        };
        const emailSet = new Set(
          (json.emails ?? []).map((e) => String(e).trim().toLowerCase())
        );
        const phoneSet = new Set(
          (json.phone ?? []).map((p) => String(p).replace(/\D/g, ""))
        );
        const emailHit = emailN ? emailSet.has(emailN) : false;
        const phoneHit = phoneD ? phoneSet.has(phoneD) : false;
        if (emailHit || phoneHit) {
          log("bypass_hit", { emailHit, phoneHit });
          const response = {
            exists: false,
            by: undefined,
            table: undefined,
            recordIds: [] as string[],
            normalized: { email: emailN, phone: phoneN },
            sourceTable: undefined,
            tableId: undefined,
          };
          return new Response(
            JSON.stringify({
              Message: "airtable check bypassed",
              HasErrors: false,
              Data: response,
            }),
            ResponseStatuses.Ok
          );
        }
      } catch (e) {
        const errMsg =
          e instanceof Error
            ? e.message
            : e === undefined
              ? "unknown"
              : String(e);
        if (errMsg.includes("Cannot resolve module")) {
          log("bypass_missing");
        } else {
          log("bypass_read_error", { error: errMsg });
        }
      }
    }

    const { usersTableId, driversTableId } = getAirtableEnv();
    if (!usersTableId && !driversTableId) {
      log("config_error", { usersTableId, driversTableId });
      return new Response(
        JSON.stringify({
          Message: "Airtable table ids not configured",
          HasErrors: true,
          Error: "missing_airtable_table_ids",
        }),
        ResponseStatuses.ServerError
      );
    }

    const normalized = { email: emailN, phone: phoneN };

    // Build formula fragments using field IDs
    const {
      formula: usersFormula,
      hasEmail: usersHasEmail,
      hasPhone: usersHasPhone,
    } = buildUsersFormula(
      emailN ? escapeAirtableString(emailN) : undefined,
      phoneD
    );
    const {
      formula: driversFormula,
      hasEmail: driversHasEmail,
      hasPhone: driversHasPhone,
    } = buildDriversFormula(
      emailN ? escapeAirtableString(emailN) : undefined,
      phoneD
    );
    log("formulas", {
      usersTableId,
      usersFormula,
      driversTableId,
      driversFormula,
    });

    let exists = false;
    let by: "email" | "phone" | undefined;
    let table: "users" | "drivers" | undefined;
    let recordIds: string[] = [];
    let tableIdMatched: string | undefined = undefined;

    if (usersTableId && usersFormula) {
      log("query_users", { usersTableId, usersFormula });
      const resUsers = await queryByFormula(usersTableId, usersFormula);
      log("result_users", {
        error: resUsers.Error,
        recordIds: resUsers.Data?.recordIds,
      });
      if (!resUsers.HasErrors && resUsers.Data?.recordIds?.length > 0) {
        exists = true;
        table = "users";
        by =
          usersHasEmail && usersHasPhone
            ? undefined
            : usersHasEmail
              ? "email"
              : "phone";
        recordIds = resUsers.Data.recordIds;
        tableIdMatched = usersTableId;
      }
    }

    if (!exists && driversTableId && driversFormula) {
      log("query_drivers", { driversTableId, driversFormula });
      const resDrivers = await queryByFormula(driversTableId, driversFormula);
      log("result_drivers", {
        error: resDrivers.Error,
        recordIds: resDrivers.Data?.recordIds,
      });
      if (!resDrivers.HasErrors && resDrivers.Data?.recordIds?.length > 0) {
        exists = true;
        table = "drivers";
        by =
          driversHasEmail && driversHasPhone
            ? undefined
            : driversHasEmail
              ? "email"
              : "phone";
        recordIds = resDrivers.Data.recordIds;
        tableIdMatched = driversTableId;
      }
    }

    const response: CheckResult & {
      sourceTable?: "users" | "drivers";
      tableId?: string;
    } = {
      exists,
      by,
      table,
      recordIds,
      normalized,
      // Alias to make consumers' lives easier without breaking shape
      sourceTable: table,
      tableId: tableIdMatched,
    };
    log("complete", response);

    return new Response(
      JSON.stringify({
        Message: "airtable check complete",
        HasErrors: false,
        Data: response,
      }),
      ResponseStatuses.Ok
    );
  } catch (e) {
    console.error("[airtable-check]", reqId, "error", (e as Error).message);
    return new Response(
      JSON.stringify({
        Message: "airtable check error",
        HasErrors: true,
        Error: (e as Error).message,
      }),
      ResponseStatuses.ServerError
    );
  }
});
