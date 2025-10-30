import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Zod schema for the driver profile payload sent from the frontend
export const DriverProfileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email(),
  phone: z.string().min(6, "Phone is required"),
  provinceId: z.string().uuid(),
  cityId: z.string().uuid(),
  suburbId: z.string().uuid(),
  platforms: z.array(z.string().uuid()).min(1, "Select at least one platform"),
  bikeOwnershipId: z.string().uuid(),
  yearsDrivingId: z.string().uuid(),
  daysPerWeek: z.number().int().min(0).max(7),
});

export type DriverProfileInput = z.infer<typeof DriverProfileSchema>;
