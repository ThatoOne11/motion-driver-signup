// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseConfig, getGeminiConfig } from "../_shared/config.ts";
import { extractTextWithGoogleVision } from "./helper-functions/vision.ts";
import promptData from "./prompt/prompt.json" assert { type: "json" };
import { callGemini } from "./services/gemini.ts";

type DocRow = {
  id: string;
  document_type_id: string;
  document_storage_path: string;
};

const BUCKET_ID = "driver-document-uploads";

function schemaFor(docKey: string) {
  const key = docKey.toLowerCase();
  if (key.includes("id") && key.includes("proof")) {
    return {
      type: "object",
      properties: {
        full_name: { type: "string", nullable: true },
        id_number: { type: "string", nullable: true },
        date_of_birth: { type: "string", nullable: true },
        nationality: { type: "string", nullable: true },
        date_of_issue: { type: "string", nullable: true },
      },
    } as any;
  }
  if (
    key.includes("licence-disc") ||
    key.includes("licence disc") ||
    key.includes("disc")
  ) {
    return {
      type: "object",
      properties: {
        licence_number: { type: "string", nullable: true },
        make: { type: "string", nullable: true },
        expiry_date: { type: "string", nullable: true },
      },
    } as any;
  }
  if (key.includes("driver") || key.includes("licence")) {
    return {
      type: "object",
      properties: {
        id_number: { type: "string", nullable: true },
        valid_from: { type: "string", nullable: true },
        valid_to: { type: "string", nullable: true },
        codes: { type: "array", items: { type: "string" }, nullable: true },
        first_issue_date: { type: "string", nullable: true },
        name: { type: "string", nullable: true },
      },
    } as any;
  }
  if (key.includes("bank")) {
    return {
      type: "object",
      properties: {
        account_holder: { type: "string", nullable: true },
        bank_name: { type: "string", nullable: true },
        account_type: { type: "string", nullable: true },
        account_number: { type: "string", nullable: true },
        branch_name: { type: "string", nullable: true },
        branch_code: { type: "string", nullable: true },
      },
    } as any;
  }
  return { type: "object", properties: {} } as any;
}

function buildPrompt(docKey: string) {
  const key = docKey.toLowerCase();
  const base = (promptData as any).base.replace("{docType}", docKey);
  if (key.includes("id") && key.includes("proof"))
    return base + (promptData as any).idProof;
  if (
    key.includes("licence-disc") ||
    key.includes("licence disc") ||
    key.includes("disc")
  )
    return base + (promptData as any).licenceDisc;
  if (key.includes("driver") || key.includes("licence"))
    return base + (promptData as any).driversLicence;
  if (key.includes("bank")) return base + (promptData as any).bankingProof;
  return base;
}

// callGemini moved to services/gemini.ts

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return new Response(
      JSON.stringify({ Message: "Method not allowed", HasErrors: true }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  const requestId = crypto.randomUUID();
  console.log("[document-llm-extract] start", { requestId });

  try {
    const { GEMINI_API_KEY, GEMINI_MODEL } = getGeminiConfig();
    const { SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY } = getSupabaseConfig();
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    });

    const { data: authUser, error: authErr } =
      await supabaseUser.auth.getUser();
    if (authErr || !authUser?.user?.id) {
      return new Response(
        JSON.stringify({ Message: "Unauthorised", HasErrors: true }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const userId = authUser.user.id;

    // Map type id -> key name
    const { data: typeRows, error: typeErr } = await supabaseAdmin
      .from("document_types")
      .select("id, name");
    if (typeErr) throw new Error(typeErr.message);
    const toKey = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    const typeKey = new Map<string, string>();
    for (const t of typeRows ?? []) typeKey.set(t.id, toKey(t.name));

    // Latest docs per type
    const { data: rows } = await supabaseAdmin
      .from("driver_documents")
      .select("id, document_type_id, document_storage_path")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const latestByType = new Map<string, DocRow>();
    for (const r of rows ?? [])
      if (!latestByType.has(r.document_type_id))
        latestByType.set(r.document_type_id, r as DocRow);

    const results: any[] = [];

    for (const row of latestByType.values()) {
      const path = row.document_storage_path;
      try {
        const key = typeKey.get(row.document_type_id) ?? "document";
        // Skip top-box photos (manual review only)
        if (key.includes("top") && key.includes("box")) {
          console.log("[document-llm-extract] skip top-box photo", {
            requestId,
            path,
          });
          results.push({ path, typeId: row.document_type_id, skipped: true });
          continue;
        }
        const { data: blob, error: dErr } = await supabaseAdmin.storage
          .from(BUCKET_ID)
          .download(path);
        if (dErr) throw new Error(dErr.message);
        if (!blob) throw new Error("Missing file");

        // OCR via Vision first, then send to Gemini as text (cheaper and robust)
        const { text } = await (async () => {
          try {
            const gcvKey = Deno.env.get("GCV_API_KEY");
            if (!gcvKey) throw new Error("GCV_API_KEY missing");
            const res = await extractTextWithGoogleVision(
              gcvKey,
              blob as Blob,
              path
            );
            return { text: res.text } as any;
          } catch (e) {
            console.warn(
              "[document-llm-extract] OCR failed; proceeding with empty text",
              {
                requestId,
                path,
                error: e instanceof Error ? e.message : String(e),
              }
            );
            return { text: "" };
          }
        })();

        // Concise OCR log (no full text)
        console.log("[document-llm-extract] OCR", {
          requestId,
          path,
          chars: (text || "").length,
        });

        const schema = schemaFor(key);
        const prompt = buildPrompt(key);
        const useSchema =
          schema && Object.keys(schema.properties ?? {}).length > 0
            ? schema
            : null;
        // Minimal marker for extraction phase
        console.log("[document-llm-extract] extracting", {
          requestId,
          path,
          docTypeKey: key,
        });
        let extracted = await callGemini(
          GEMINI_API_KEY,
          GEMINI_MODEL,
          useSchema,
          prompt,
          String(text ?? "")
        );

        // Post-validate licence disc number to avoid header/reg/VIN confusion
        if (
          key.includes("licence-disc") ||
          key.includes("licence disc") ||
          key.includes("disc")
        ) {
          const isValidPlate = (v: any) =>
            typeof v === "string" &&
            /^[A-Z0-9]{5,8}$/.test(v) &&
            /[A-Z]/.test(v) &&
            /\d/.test(v);
          const current = (extracted?.licence_number ?? "")
            .toString()
            .toUpperCase();
          if (!isValidPlate(current)) {
            const n = (text ?? "").toString().toUpperCase();
            const m = n.match(
              /(?:LICENCE\s*NO\.?|LISENSIENR\.?)[^A-Z0-9]*([A-Z0-9]{5,8})/
            );
            if (m) {
              extracted = { ...(extracted ?? {}), licence_number: m[1] };
            }
          }
        }

        // Persist extraction result (LLM)
        await supabaseAdmin.from("document_upload_extraction").upsert(
          [
            {
              driver_document_id: row.id,
              document_type_id: row.document_type_id,
              user_id: userId,
              fields_json: extracted ?? {},
              raw_text: String(text ?? ""),
            },
          ],
          { onConflict: "driver_document_id" }
        );

        results.push({ path, typeId: row.document_type_id, fields: extracted });
        try {
          console.log("[document-llm-extract] extracted", {
            requestId,
            path,
            keys: Object.keys(extracted ?? {}),
          });
          console.log("[document-llm-extract] fields", {
            requestId,
            path,
            fields: extracted ?? {},
          });
        } catch {}
      } catch (err: any) {
        console.error("[document-llm-extract] error", {
          requestId,
          path,
          error: err?.message,
        });
        results.push({
          path,
          typeId: row.document_type_id,
          error: err?.message || String(err),
        });
      }
    }

    // Mark user as having uploaded documents if all extractions succeeded
    const hasErrors = results.some((r) => r.error);
    if (!hasErrors) {
      const { error: upErr } = await supabaseAdmin
        .from("users")
        .update({ documents_uploaded: true })
        .eq("id", userId);
      if (upErr) {
        console.warn(
          "[document-llm-extract] failed to set documents_uploaded",
          { requestId, error: upErr.message }
        );
      }
    }

    console.log("Finished document extraction");

    return new Response(
      JSON.stringify({ HasErrors: hasErrors, Results: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        HasErrors: true,
        Message: e?.message || "Unexpected error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
