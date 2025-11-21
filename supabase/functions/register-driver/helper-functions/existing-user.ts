import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.56.0/dist/module/index.d.ts";
import { FunctionResponseType } from "../../_shared/models.ts";

export async function existingUser(
  adminClient: SupabaseClient,
  email: string,
  phone: string,
  rawPhone?: string,
  countryCode?: string
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

    const variants = new Set<string>();
    const addVariant = (v?: string | null) => {
      if (v && v.length > 0) variants.add(v);
    };

    addVariant(phone);
    addVariant(rawPhone);

    const digitsFromNormalized = (phone ?? "").replace(/\D/g, "");
    const digitsFromRaw = (rawPhone ?? "").replace(/\D/g, "");
    addVariant(digitsFromNormalized);
    addVariant(digitsFromRaw);

    // Add a local-format variant (0XXXXXXXXX) when we can derive it from the country code
    const ccClean = (countryCode ?? "").replace(/^\+/, "");
    if (ccClean && digitsFromNormalized.startsWith(ccClean)) {
      const local = digitsFromNormalized.slice(ccClean.length);
      if (local.length > 0) {
        addVariant(`0${local}`);
        addVariant(local);
      }
    }

    const phoneValues = Array.from(variants);
    const phoneQuery = adminClient.from("users").select("id");
    if (phoneValues.length === 1) {
      phoneQuery.eq("phone_number", phoneValues[0]);
    } else if (phoneValues.length > 1) {
      phoneQuery.in("phone_number", phoneValues);
    }

    const { data: existingPhone, error: phoneLookupError } = await phoneQuery
      .limit(1)
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
