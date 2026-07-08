import { z } from "zod";
import { paginationSchema } from "@/shared/lib/pagination";

export const listSafeMovementsSchema = paginationSchema.extend({
  type: z
    .enum([
      "FUNDING",
      "SANGRIA",
      "CASH_REGISTER_HANDOFF",
      "MANUAL_ADJUSTMENT",
      "ACCOUNTS_PAYABLE_PAYMENT",
    ])
    .optional(),
  createdAtFrom: z.coerce.date().optional(),
  createdAtTo: z.coerce.date().optional(),
});

export type ListSafeMovementsInput = z.infer<typeof listSafeMovementsSchema>;
