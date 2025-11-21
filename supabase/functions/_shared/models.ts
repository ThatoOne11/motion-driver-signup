import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

export const ResponseObject = z.object({
  Message: z.string(),
  HasErrors: z.boolean(),
  Error: z.string().optional(),
  ErrorList: z.array(z.any()).optional(),
});

export type ResponseObjectType = z.infer<typeof ResponseObject>;

export const FunctionResponse = z.object({
  Message: z.string(),
  HasErrors: z.boolean(),
  Error: z.string().optional(),
  ErrorList: z.array(z.any()).optional(),
  Data: z.any(),
});

export type FunctionResponseType = z.infer<typeof FunctionResponse>;

export const MotionDriverResponseObject = z.object({
  Message: z.string(),
  HasErrors: z.boolean(),
  motionId: z.string(),
  airtableRecordId: z.string(),
});

export const DocumentUploadResponse = z.object({
  Message: z.string(),
  HasErrors: z.boolean(),
  Count: z.number(),
  Results: z.array(
    z.object({
      path: z.string(),
      typeId: z.string(),
      text: z.string().optional(),
      error: z.string().optional(),
      parsed: z.any().optional(),
      extractionError: z.boolean().optional(),
    })
  ),
});

export const ResponseStatuses = {
  ServerError: {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  },
  BadRequest: {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  },
  Unauthorised: {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  },
  Ok: {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  },
};

export const InspectorRegisterSchema = z.object({
  airtableRecordId: z.string(),
  motionId: z.string(),
});

// Registration payload for driver sign-up via Edge Function
export const RegisterDriverRequest = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string(),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  inspector: z.boolean().optional(),
  inspectorDetails: z.array(InspectorRegisterSchema).optional(),
});

export type RegisterDriverRequest = z.infer<typeof RegisterDriverRequest>;

// Invite user payload (admin-triggered)
export const InviteUserRequest = z.object({
  email: z.string().email(),
  displayName: z.string().min(1, "Display name is required"),
  phoneNumber: z
    .string()
    .regex(/^0\d{9}$/, "Phone must start with 0 and be 10 digits"),
  role: z.enum(["admin", "driver"]),
});

export type InviteUserRequest = z.infer<typeof InviteUserRequest>;

export const DriverRegisterSchema = z.object({});
