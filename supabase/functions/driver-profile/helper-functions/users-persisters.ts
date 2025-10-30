// deno-lint-ignore-file no-explicit-any
export async function preUpdateUserDetails(
  supabaseAdmin: any,
  userId: string,
  displayName?: string,
  phone?: string,
) {
  const updatePayload: Record<string, any> = {};
  if (displayName) updatePayload.display_name = displayName;
  if (phone) updatePayload.phone_number = phone;
  if (Object.keys(updatePayload).length === 0) return;
  const { error } = await supabaseAdmin
    .from("users")
    .update(updatePayload)
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function saveAirtableRefs(
  supabaseAdmin: any,
  userId: string,
  opts: { airtableRecordId?: string; airtableMotionId?: string },
) {
  const payload: Record<string, any> = {};
  if (opts.airtableRecordId) payload.airtable_record_id = opts.airtableRecordId;
  if (opts.airtableMotionId != null) payload.airtable_motion_id = opts.airtableMotionId;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabaseAdmin
    .from("users")
    .update(payload)
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function finalizeProfileCompleted(
  supabaseAdmin: any,
  userId: string,
) {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ profile_completed: true })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

