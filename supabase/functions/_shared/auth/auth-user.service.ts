import SupabaseClient from "https://esm.sh/@supabase/supabase-js@2.56.0/dist/module/SupabaseClient.d.ts";

export async function getAuthUser(supabaseUser: SupabaseClient, reqId?: string) {
  // 4.1 Identify user from auth context
  const { data: authUser, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr) {
    console.warn("[driver-profile] getUser error", {
      reqId,
      error: authErr.message,
    });
    return {
      HasErrors: true,
      error: "Error fetching Auth user",
    };
  }
  const currentUserId = authUser.user?.id;
  if (!currentUserId) {
    console.warn("[driver-profile] missing user id", { reqId });
    return {
      HasErrors: true,
      error: "Missing User ID",
    };
  }

  return {
    userId: currentUserId,
    HasErrors: false,
  };
}
