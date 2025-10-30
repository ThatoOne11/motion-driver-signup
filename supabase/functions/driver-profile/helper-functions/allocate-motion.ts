// deno-lint-ignore-file no-explicit-any
export async function allocateSuperMotionIdForUser(
  supabaseAdmin: any,
  userId: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc(
    "allocate_super_motion_id_for_user",
    { target_user_id: userId },
  );
  if (error) {
    throw new Error(error.message);
  }
  return Array.isArray(data) ? (data[0] as string) : (data as string);
}

