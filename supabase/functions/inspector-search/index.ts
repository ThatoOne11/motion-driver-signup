import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  InspectorRequestSchema,
  InspectorReturnSchema,
} from "./models/models.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { ResponseObject, ResponseStatuses } from "../_shared/models.ts";
import { searchDriverInAirtable } from "./services/airtable-search.service.ts";
import { getCampaignNames } from "./services/airtable-campaign.service.ts";
import { AIRTABLE_FIELDS } from "./config/airtable.config.ts";
import { InspectorRequestType } from "./models/models.ts";
import { jwtDecode, JwtPayload } from "https://esm.sh/jwt-decode@4.0.0";

type InspectorSearchLiteral = InspectorRequestType["type"];

const FIELD_ID_BY_TYPE: Record<InspectorSearchLiteral, string> = {
  motionId: AIRTABLE_FIELDS.motionId,
  email: AIRTABLE_FIELDS.email,
  name: AIRTABLE_FIELDS.name,
};

const GENERIC_ERROR_MESSAGE =
  "There was a system error while searching. Please contact the tech support team for help.";

Deno.serve(async (req) => {
  let responseType: InspectorSearchLiteral = "name";
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

  console.log("[Inspector-Search] Starting inspector search ...");

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
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
    if (roleClaim !== "inspector") {
      const res = ResponseObject.parse({
        Message: "You do not have permission to perform this action.",
        HasErrors: true,
        Error: "unauthorized",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.Unauthorised);
    }

    const requestBody = await req.json();

    const parsed = InspectorRequestSchema.safeParse(requestBody);

    if (!parsed.success) {
      console.warn("[Inspector-Search] validation failed", {
        issues: parsed.error.issues,
      });
      const res = ResponseObject.parse({
        Message: "Invalid form inputs",
        HasErrors: true,
        Error: parsed.error.issues,
      });
      return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
    }

    const inspectorSearch = parsed.data;
    const searchType = inspectorSearch.type;
    responseType = searchType;

    const fieldId = FIELD_ID_BY_TYPE[searchType];
    if (!fieldId) {
      const res = ResponseObject.parse({
        Message: `Unsupported search type: ${searchType}`,
        HasErrors: true,
        Error: "unsupported_type",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.BadRequest);
    }

    const useFuzzyMatch = searchType === "name";

    const airtableSearchResult = await searchDriverInAirtable(
      fieldId,
      inspectorSearch.searchValue,
      {
        fuzzy: useFuzzyMatch,
        collectMultiple: useFuzzyMatch,
        maxMatches: 10,
      }
    );

    if (airtableSearchResult.errorMessage) {
      console.warn("[Inspector-Search] search returned error", {
        error: airtableSearchResult.errorMessage,
      });
      const responsePayload = InspectorReturnSchema.parse({
        Type: searchType,
        HasErrors: true,
        ErrorMessage: GENERIC_ERROR_MESSAGE,
        Matches: [],
        MatchCount: 0,
      });
      return new Response(JSON.stringify(responsePayload), ResponseStatuses.Ok);
    }

    const airtableResult = airtableSearchResult.exactMatch;
    const matches = airtableSearchResult.matches;

    if (!airtableResult && (!matches || matches.length === 0)) {
      const responsePayload = InspectorReturnSchema.parse({
        Type: searchType,
        HasErrors: true,
        ErrorMessage: "No matching driver found for the provided details.",
        Matches: [],
        MatchCount: 0,
      });
      return new Response(JSON.stringify(responsePayload), ResponseStatuses.Ok);
    }

    const campaignIdsToLookup = new Set<string>();
    if (airtableResult?.campaignId) {
      campaignIdsToLookup.add(airtableResult.campaignId);
    }
    for (const match of matches ?? []) {
      if (match.campaignId) {
        campaignIdsToLookup.add(match.campaignId);
      }
    }

    const campaignNamesMap =
      campaignIdsToLookup.size > 0
        ? await getCampaignNames(Array.from(campaignIdsToLookup))
        : {};

    const campaignName = airtableResult?.campaignId
      ? (campaignNamesMap[airtableResult.campaignId] ?? null)
      : null;

    const normalizedMatches = matches ? [...matches] : [];
    if (airtableResult) {
      const exists = normalizedMatches.some(
        (match) => match.recordId === airtableResult.recordId
      );
      if (!exists) {
        normalizedMatches.unshift(airtableResult);
      }
    }

    const responsePayload = InspectorReturnSchema.parse({
      Type: searchType,
      HasErrors: false,
      Matches: normalizedMatches.map((match) => ({
        recordId: match.recordId,
        name: match.name,
        email: match.email,
        phone: match.phone,
        motionId: match.motionId,
        onCampaign: match.onCampaign,
        campaignName: match.campaignId
          ? (campaignNamesMap[match.campaignId] ?? undefined)
          : undefined,
      })),
      MatchCount: normalizedMatches.length,
    });

    return new Response(JSON.stringify(responsePayload), ResponseStatuses.Ok);
  } catch (serverError) {
    console.error("[Inspector-Search] unhandled server error", {
      error: (serverError as Error).message,
    });
    const fallback = InspectorReturnSchema.parse({
      Type: responseType,
      HasErrors: true,
      ErrorMessage: GENERIC_ERROR_MESSAGE,
      Matches: [],
      MatchCount: 0,
    });
    return new Response(JSON.stringify(fallback), ResponseStatuses.Ok);
  }
});
