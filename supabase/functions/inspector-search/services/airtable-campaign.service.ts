import {
  AIRTABLE_CAMPAIGN_NAME_FIELD,
  AIRTABLE_CAMPAIGNS_TABLE_ID,
} from "../config/airtable.config.ts";

function getCampaignEnv() {
  const token = Deno.env.get("AIRTABLE_ACCESS_TOKEN");
  const appId = Deno.env.get("AIRTABLE_APP_ID");
  if (!token || !appId || !AIRTABLE_CAMPAIGNS_TABLE_ID) {
    throw new Error("Missing Airtable campaign configuration.");
  }
  const baseUrl = `https://api.airtable.com/v0/${appId}/${AIRTABLE_CAMPAIGNS_TABLE_ID}`;
  return { token, baseUrl };
}

function escapeId(id: string): string {
  return id.replace(/'/g, "\\'");
}

export async function getCampaignNames(
  campaignRecordIds: string[]
): Promise<Record<string, string>> {
  const ids = Array.from(
    new Set(
      campaignRecordIds
        .map((id) => id?.trim())
        .filter((id): id is string => !!id)
    )
  );

  if (ids.length === 0) {
    return {};
  }

  const { token, baseUrl } = getCampaignEnv();
  const url = new URL(baseUrl);
  url.searchParams.set("returnFieldsByFieldId", "true");
  url.searchParams.set(
    "filterByFormula",
    `OR(${ids.map((id) => `RECORD_ID()='${escapeId(id)}'`).join(",")})`
  );
  url.searchParams.set("pageSize", ids.length.toString());

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Airtable-Use-Field-Ids": "true",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[Inspector-Search] campaign lookup failed", {
        ids,
        status: res.status,
        message: text?.slice(0, 200),
      });
      return {};
    }

    const payload = (await res.json()) as {
      records?: { id: string; fields?: Record<string, unknown> }[];
    };

    const map: Record<string, string> = {};
    for (const record of payload.records ?? []) {
      const rawName = record.fields?.[AIRTABLE_CAMPAIGN_NAME_FIELD];
      const trimmed =
        typeof rawName === "string" ? rawName.trim() : undefined;
      if (trimmed && trimmed.length > 0) {
        map[record.id] = trimmed;
      }
    }
    return map;
  } catch (error) {
    console.error("[Inspector-Search] campaign lookup error", {
      ids,
      error: (error as Error).message,
    });
    return {};
  }
}

export async function getCampaignName(
  campaignRecordId?: string | null
): Promise<string | null> {
  const recordId = campaignRecordId?.trim();
  if (!recordId) {
    return null;
  }

  const map = await getCampaignNames([recordId]);
  return map[recordId] ?? null;
}
