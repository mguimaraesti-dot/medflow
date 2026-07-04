import { z } from "zod";
import { paginationSchema } from "@/shared/lib/pagination";

export const listSafeMovementsSchema = paginationSchema.extend({
  type: z
    .enum(["FUNDING", "SANGRIA", "CASH_REGISTER_HANDOFF", "MANUAL_ADJUSTMENT"])
    .optional(),
});

export type ListSafeMovementsInput = z.infer<typeof listSafeMovementsSchema>;
