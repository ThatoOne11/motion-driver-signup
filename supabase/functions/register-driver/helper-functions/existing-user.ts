import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.56.0/dist/module/index.d.ts";
import { FunctionResponseType } from "../../_shared/models.ts";

export async function existingUser(
  adminClient: SupabaseClient,
  email: string,
  phone: string
): Promise<FunctionResponseType> {
  {
    const { data: existingEmail, error: emailLookupError } = await adminClient
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (emailLookupError) {
      return {
        Message: "Error checking email",
        HasErrors: true,
        Error: emailLookupError.message,
      };
    }
    if (existingEmail) {
      return {
        Message:
          "There is already a driver registered with that email, Please try again with a different email or go to the login page to login with your details.",
        HasErrors: true,
      };
    }

    const { data: existingPhone, error: phoneLookupError } = await adminClient
      .from("users")
      .select("id")
      .eq("phone_number", phone)
      .maybeSingle();
    if (phoneLookupError) {
      return {
        Message: "Error checking phone number",
        HasErrors: true,
        Error: phoneLookupError.message,
      };
    }
    if (existingPhone) {
      return {
        Message:
          "There is already a driver with that phone, Please try again with a different phone or go to the login page to login with your details.",
        HasErrors: true,
      };
    }
  }
  return {
    Message: "No existing user found",
    HasErrors: false,
  };
}
