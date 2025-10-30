import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.56.0/dist/module/index.d.ts";
import { FunctionResponseType } from "../../_shared/models.ts";

export async function getDriverRoleId(
  admin: SupabaseClient,
  role: string
): Promise<FunctionResponseType> {
  // Try to fetch a single role row matching the name
  const { data, error } = await admin
    .from("roles")
    .select("id")
    .eq("name", role)
    .maybeSingle();

  if (error) {
    return {
      Message: "Error retrieving role ID",
      HasErrors: true,
      Error: error.message,
    };
  }

  // If no row returned, treat as not found
  if (!data || !data.id) {
    return {
      Message: "Role not found",
      HasErrors: true,
      Error: `Role "${role}" not found`,
    };
  }

  return {
    Message: "Success",
    HasErrors: false,
    Data: data.id,
  };
}
