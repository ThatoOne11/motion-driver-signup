// deno-lint-ignore-file no-explicit-any
/**
 * Calls Gemini with OCR text + optional JSON schema and returns parsed JSON.
 */
export async function callGemini(
  apiKey: string,
  model: string,
  schema: any | null,
  prompt: string,
  ocrText: string
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const base: any = {
    contents: [
      { role: "user", parts: [{ text: `${prompt}\n\nOCR TEXT:\n${ocrText}` }] },
    ],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json",
    },
  };
  if (
    schema &&
    schema.properties &&
    Object.keys(schema.properties ?? {}).length > 0
  ) {
    base.generationConfig.response_schema = schema;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(base),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || `Gemini error ${res.status}`;
    throw new Error(msg);
  }
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
