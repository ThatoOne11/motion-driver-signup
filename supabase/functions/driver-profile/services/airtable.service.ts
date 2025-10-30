// deno-lint-ignore-file no-explicit-any
export type AirtableServiceResult = {
  HasErrors: boolean;
  Message: string;
  Error?: string;
  recordId?: string;
  fields?: Record<string, any>;
};

type AirtableRecord = { id: string; fields: Record<string, any> };

function getAirtableEnv(tableIdOverride?: string) {
  const token = Deno.env.get("AIRTABLE_ACCESS_TOKEN");
  const appId = Deno.env.get("AIRTABLE_APP_ID");
  const tableId = tableIdOverride ?? Deno.env.get("AIRTABLE_DRIVERS_TABLE_ID");
  if (!token || !appId || !tableId) {
    throw new Error(
      "Missing Airtable env: AIRTABLE_ACCESS_TOKEN / AIRTABLE_APP_ID / AIRTABLE_TABLE_ID"
    );
  }
  const baseUrl = `https://api.airtable.com/v0/${appId}/${tableId}`;
  return { token, baseUrl };
}

async function airtableFetch(
  path: string,
  init?: RequestInit,
  tableIdOverride?: string
) {
  const { token, baseUrl } = getAirtableEnv(tableIdOverride);
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Airtable-Use-Field-Ids": "true",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Airtable ${init?.method ?? "GET"} ${path} failed: ${res.status} ${text}`
    );
  }
  return res.json();
}

export async function createRecord(
  fields: Record<string, any>
): Promise<AirtableServiceResult> {
  try {
    const payload = { fields };
    const json = await airtableFetch("?typecast=true", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const rec = json as AirtableRecord;
    return {
      HasErrors: false,
      Message: "Created Airtable record",
      recordId: rec.id,
    };
  } catch (e) {
    return {
      HasErrors: true,
      Message: "Airtable create failed",
      Error: (e as Error).message,
    };
  }
}

export async function createRecordInTable(
  tableId: string,
  fields: Record<string, any>
): Promise<AirtableServiceResult> {
  try {
    const payload = { fields };
    const json = await airtableFetch(
      "?typecast=true",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      tableId
    );
    const rec = json as AirtableRecord;
    return {
      HasErrors: false,
      Message: "Created Airtable record",
      recordId: rec.id,
    };
  } catch (e) {
    return {
      HasErrors: true,
      Message: "Airtable create failed",
      Error: (e as Error).message,
    };
  }
}

export async function getRecordFields(
  recordId: string
): Promise<AirtableServiceResult> {
  try {
    const json = await airtableFetch(`/${recordId}?returnFieldsByFieldId=true`);
    const rec = json as AirtableRecord;
    return {
      HasErrors: false,
      Message: "Fetched Airtable record",
      recordId: rec.id,
      fields: rec.fields,
    };
  } catch (e) {
    return {
      HasErrors: true,
      Message: "Fetch Airtable record failed",
      Error: (e as Error).message,
    };
  }
}
