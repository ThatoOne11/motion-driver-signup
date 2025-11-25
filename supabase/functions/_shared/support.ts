import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const SupportSchema = z.object({
  preMessage: z.string().trim().default(""),
  userMessage: z.string().trim().min(1, "Message is required."),
  name: z.string().trim().optional().default(""),
  motionId: z.string().trim().optional().default(""),
  supportPhoneNumber: z.string().trim().min(5, "Support phone is required."),
  userPhoneNumber: z.string().trim().min(5, "User phone is required."),
  userEmail: z.string().trim().email().optional().or(z.literal("")).default(""),
  sourceTag: z.string().trim().optional().default(""),
});

export type SupportPayload = z.infer<typeof SupportSchema>;
