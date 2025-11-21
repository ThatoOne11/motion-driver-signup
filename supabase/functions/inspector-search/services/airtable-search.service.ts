import {
  AIRTABLE_FIELDS,
  AIRTABLE_FALLBACK_PHONE_FIELD,
  AIRTABLE_DRIVER_CAMPAIGN_STATUS_FIELD,
  AIRTABLE_DRIVER_CAMPAIGN_ID_FIELD,
} from "../config/airtable.config.ts";

type AirtableRecord = { id: string; fields: Record<string, unknown> };

export type AirtableInspectorResult = {
  recordId: string;
  name: string;
  email: string;
  phone: string;
  motionId: string;
  onCampaign: boolean;
  campaignId?: string | null;
};

type SearchOptions = {
  fuzzy?: boolean;
  collectMultiple?: boolean;
  maxMatches?: number;
};

function getDriversTableConfig() {
  const token = Deno.env.get("AIRTABLE_ACCESS_TOKEN");
  const appId = Deno.env.get("AIRTABLE_APP_ID");
  const tableId = Deno.env.get("AIRTABLE_DRIVERS_TABLE_ID");
  if (!token || !appId || !tableId) {
    throw new Error("Missing Airtable driver table configuration.");
  }
  return {
    token,
    baseUrl: `https://api.airtable.com/v0/${appId}/${tableId}`,
  };
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "\\'");
}

function escapeRegexChars(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFormula(
  fieldId: string,
  value: string,
  options?: SearchOptions
): string {
  const normalised = value.trim().toLowerCase();
  if (options?.fuzzy) {
    const regexSafe = escapeSingleQuotes(escapeRegexChars(normalised));
    return `REGEX_MATCH(LOWER({${fieldId}}), '.*${regexSafe}.*')`;
  }
  const exactValue = escapeSingleQuotes(normalised);
  return `LOWER({${fieldId}}) = '${exactValue}'`;
}

function buildQueryLimit(options?: SearchOptions): number {
  return options?.fuzzy ? 2 : 1;
}

function buildFetchUrl(baseUrl: string, fieldId: string, value: string): URL {
  const url = new URL(baseUrl);
  url.searchParams.set("returnFieldsByFieldId", "true");
  return url;
}

function sanitizeResultValue(value: unknown): string {
  return `${value ?? ""}`.trim();
}

function getPhoneValue(fields: Record<string, unknown>): string {
  const primaryPhone = sanitizeResultValue(fields[AIRTABLE_FIELDS.phone]);
  const fallbackPhone = sanitizeResultValue(
    fields[AIRTABLE_FALLBACK_PHONE_FIELD]
  );
  return primaryPhone || fallbackPhone;
}
function isOnCampaign(fields: Record<string, unknown>): boolean {
  const status = sanitizeResultValue(
    fields[AIRTABLE_DRIVER_CAMPAIGN_STATUS_FIELD]
  ).toLowerCase();
  return status === "on a campaign";
}

function getCampaignId(fields: Record<string, unknown>): string | null {
  const value = fields[AIRTABLE_DRIVER_CAMPAIGN_ID_FIELD];
  if (Array.isArray(value)) {
    return value.length > 0 ? sanitizeResultValue(value[0]) || null : null;
  }
  const id = sanitizeResultValue(value);
  return id.length > 0 ? id : null;
}

function shapeResult(record: AirtableRecord): AirtableInspectorResult {
  const fields = record.fields ?? {};
  const name = sanitizeResultValue(fields[AIRTABLE_FIELDS.name]);
  const phoneValue = getPhoneValue(fields);
  const emailValue = sanitizeResultValue(fields[AIRTABLE_FIELDS.email]);
  const motionIdValue = sanitizeResultValue(fields[AIRTABLE_FIELDS.motionId]);
  const campaignId = getCampaignId(fields);
  const onCampaign = isOnCampaign(fields);

  return {
    recordId: record.id,
    name,
    email: emailValue,
    phone: phoneValue,
    motionId: motionIdValue,
    onCampaign,
    campaignId,
  };
}

type SearchResult = {
  exactMatch: AirtableInspectorResult | null;
  matches?: AirtableInspectorResult[];
  errorMessage?: string;
};

export async function searchDriverInAirtable(
  fieldId: string,
  value: string,
  options?: SearchOptions
): Promise<SearchResult> {
  try {
    if (!fieldId) {
      return {
        exactMatch: null,
        matches: [],
        errorMessage: "Missing identifier configuration.",
      };
    }
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
      return { exactMatch: null, matches: [] };
    }

    const { token, baseUrl } = getDriversTableConfig();
    const url = buildFetchUrl(baseUrl, fieldId, trimmedValue);
    url.searchParams.set(
      "filterByFormula",
      buildFormula(fieldId, trimmedValue, options)
    );
    const limit = options?.collectMultiple
      ? Math.max(1, options.maxMatches ?? 5)
      : buildQueryLimit(options);
    url.searchParams.set("pageSize", limit.toString());
    url.searchParams.set("maxRecords", limit.toString());

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Airtable-Use-Field-Ids": "true",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[Inspector-Search] Airtable query failed", {
        status: res.status,
        body: text?.slice(0, 200),
      });
      return {
        exactMatch: null,
        matches: [],
        errorMessage: "Unable to query Airtable.",
      };
    }

    const payload = (await res.json()) as { records?: AirtableRecord[] };
    const safeRecords = payload.records ?? [];
    if (safeRecords.length === 0) {
      return { exactMatch: null, matches: [] };
    }

    if (options?.collectMultiple) {
      const matches = safeRecords.map((record) => shapeResult(record));
      return {
        exactMatch: matches.length === 1 ? matches[0] : null,
        matches,
      };
    }

    if (options?.fuzzy && safeRecords.length > 1) {
      const matches = safeRecords.map((record) => shapeResult(record));
      console.warn("[Inspector-Search] Multiple matches found", {
        count: matches.length,
      });
      return { exactMatch: null, matches };
    }

    return { exactMatch: shapeResult(safeRecords[0]) };
  } catch (error) {
    console.error("[Inspector-Search] search error", {
      error: (error as Error).message,
    });
    return {
      exactMatch: null,
      matches: [],
      errorMessage:
        "There was an unexpected error while searching. Please contact the tech support team.",
    };
  }
}
