import { FunctionResponseType } from "../../_shared/models.ts";

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Service-role-only authorization: compare bearer token to SUPABASE_SERVICE_ROLE_KEY
export function authorizeRequest(req: Request): FunctionResponseType {
  const auth = req.headers.get("Authorization") ?? "";
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const prefix = "Bearer ";
  const provided = auth.startsWith(prefix) ? auth.slice(prefix.length) : auth;
  if (expected && timingSafeEqual(provided, expected)) {
    return {
      Message: "authorized",
      HasErrors: false,
      Data: null,
    } as unknown as FunctionResponseType;
  }
  return {
    Message: "Unauthorized",
    HasErrors: true,
    Error: "unauthorized",
    Data: null,
  } as unknown as FunctionResponseType;
}
