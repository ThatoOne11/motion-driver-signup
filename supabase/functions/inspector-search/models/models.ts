import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const InspectorRequestSchema = z.object({
  type: z.enum(["motionId", "email", "name"]),
  searchValue: z.string().min(1, "Search Value is too short"),
});

export type InspectorRequestType = z.infer<typeof InspectorRequestSchema>;

const InspectorMatchSchema = z.object({
  recordId: z.string(),
  name: z.string(),
  motionId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  onCampaign: z.boolean().optional(),
  campaignName: z.string().optional(),
});

export const InspectorReturnSchema = z.object({
  Type: z.enum(["motionId", "email", "name"]),
  HasErrors: z.boolean(),
  ErrorMessage: z.string().optional(),
  Matches: z.array(InspectorMatchSchema),
  MatchCount: z.number(),
});

export type InspectorReturnType = z.infer<typeof InspectorReturnSchema>;
