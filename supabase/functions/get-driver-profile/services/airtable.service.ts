export async function fetchAirtableRecord(recordId: string) {
  const baseId = Deno.env.get("AIRTABLE_APP_ID")!;
  const tableId = Deno.env.get("AIRTABLE_DRIVERS_TABLE_ID")!;
  const token = Deno.env.get("AIRTABLE_ACCESS_TOKEN")!;

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}?returnFieldsByFieldId=true`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Airtable fetch failed: ${res.statusText}`);
  }

  return await res.json();
}
