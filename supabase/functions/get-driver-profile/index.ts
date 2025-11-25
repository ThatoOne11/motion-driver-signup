import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/auth/auth-user.service.ts";
import { ResponseObject, ResponseStatuses } from "../_shared/models.ts";
import { fetchAirtableRecord } from "./services/airtable.service.ts";
import { AIRTABLE_FIELD_IDS } from "./config/airtable.config.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const authUser = await getAuthUser(supabaseClient);
    if (authUser.HasErrors || !authUser.userId) {
      const res = ResponseObject.parse({
        Message: "Unauthorized",
        HasErrors: true,
        Error: "User not authenticated",
      });
      return new Response(JSON.stringify(res), ResponseStatuses.Unauthorised);
    }

    //Get Airtable ID from DB
    const { data: userData, error: dbError } = await supabaseClient
      .from("users")
      .select("airtable_record_id")
      .eq("id", authUser.userId)
      .single();

    if (dbError || !userData?.airtable_record_id) {
      const res = ResponseObject.parse({
        Message: "Profile not linked",
        HasErrors: false,
        Data: null,
      });
      return new Response(JSON.stringify(res), ResponseStatuses.Ok);
    }

    const record = await fetchAirtableRecord(userData.airtable_record_id);
    const fields = record.fields;

    const fullName = fields[AIRTABLE_FIELD_IDS.fullName] || "";
    const nameParts = fullName.split(" ");

    const profileData = {
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      phoneNumber: fields[AIRTABLE_FIELD_IDS.phone] || "",
      email: fields[AIRTABLE_FIELD_IDS.email] || "",
      motionId: fields[AIRTABLE_FIELD_IDS.motionId] || "",
      province: fields[AIRTABLE_FIELD_IDS.province] || "",
      platforms: Array.isArray(fields[AIRTABLE_FIELD_IDS.platforms])
        ? fields[AIRTABLE_FIELD_IDS.platforms].join(", ")
        : fields[AIRTABLE_FIELD_IDS.platforms] || "",
      bikeOwnership: fields[AIRTABLE_FIELD_IDS.bikeOwnership] || "",
      yearsDriving: fields[AIRTABLE_FIELD_IDS.yearsDriving] || "",
    };

    const res = {
      Message: "Profile retrieved successfully",
      HasErrors: false,
      Data: profileData,
    };

    return new Response(JSON.stringify(res), ResponseStatuses.Ok);
  } catch (error) {
    console.error("Error in get-driver-profile:", error);
    const res = ResponseObject.parse({
      Message: "Internal Server Error",
      HasErrors: true,
      Error: (error as Error).message,
    });
    return new Response(JSON.stringify(res), ResponseStatuses.ServerError);
  }
});
