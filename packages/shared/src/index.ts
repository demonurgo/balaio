import { z } from "zod";

export const fairRoleSchema = z.enum(["owner", "editor", "viewer"]);

export const fairItemSchema = z.object({
  id: z.string().uuid(),
  fairId: z.string().uuid(),
  name: z.string().min(1).max(160),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1).max(24),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  purchased: z.boolean(),
  category: z.string().max(80).nullable().optional(),
  notes: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional()
});

export const fairSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(160),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  budget: z.number().nonnegative(),
  total: z.number().nonnegative(),
  memberCount: z.number().int().nonnegative()
});

export type FairRole = z.infer<typeof fairRoleSchema>;
export type FairItem = z.infer<typeof fairItemSchema>;
export type FairSummary = z.infer<typeof fairSummarySchema>;
