// deno-lint-ignore-file no-explicit-any
import { FunctionResponseType } from "../../_shared/models.ts";
import { getEnvBool } from "../../_shared/config.ts";

function getAirtableEnv() {
  const token = Deno.env.get("AIRTABLE_ACCESS_TOKEN");
  const appId = Deno.env.get("AIRTABLE_APP_ID");
  if (!token || !appId) {
    throw new Error(
      "Missing Airtable env: AIRTABLE_ACCESS_TOKEN / AIRTABLE_APP_ID"
    );
  }
  const baseUrl = (tid: string) =>
    `https://api.airtable.com/v0/${appId}/${tid}`;
  return { token, baseUrl };
}

export async function queryByFormula(
  tableId: string,
  formula: string
): Promise<FunctionResponseType> {
  try {
    const reqId = crypto.randomUUID();
    const LOG = getEnvBool("LOG_AIRTABLE_CHECK", true);
    const log = (...args: any[]) => {
      if (LOG) console.log("[airtable-check:service]", reqId, ...args);
    };
    log("fetch", { tableId, formula });
    const { token, baseUrl } = getAirtableEnv();
    const url = `${baseUrl(tableId)}?filterByFormula=${encodeURIComponent(formula)}&pageSize=1`;
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
      log("error", { status: res.status, text: text?.slice(0, 400) });
      return {
        Message: "Airtable query failed",
        HasErrors: true,
        Error: `${res.status} ${text}`,
        Data: null,
      } as unknown as FunctionResponseType;
    }
    const json = await res.json();
    const records = (json?.records ?? []) as Array<{ id: string }>;
    log("ok", { count: records.length, first: records[0]?.id });
    return {
      Message: "Airtable query ok",
      HasErrors: false,
      Data: { recordIds: records.map((r) => r.id) },
    } as unknown as FunctionResponseType;
  } catch (e) {
    console.error(
      "[airtable-check:service]",
      "exception",
      (e as Error).message
    );
    return {
      Message: "Airtable query exception",
      HasErrors: true,
      Error: (e as Error).message,
      Data: null,
    } as unknown as FunctionResponseType;
  }
}
