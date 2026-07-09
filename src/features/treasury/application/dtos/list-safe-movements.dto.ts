import { z } from "zod";
import { paginationSchema } from "@/shared/lib/pagination";

const safeMovementTypeSchema = z.enum([
  "FUNDING",
  "SANGRIA",
  "CASH_REGISTER_HANDOFF",
  "MANUAL_ADJUSTMENT",
  "ACCOUNTS_PAYABLE_PAYMENT",
]);

export const listSafeMovementsSchema = paginationSchema.extend({
  /** Lista separada por vírgula (ex: `SANGRIA,FUNDING`) — usado pelos filtros rápidos Recepção/Contas a Pagar/Ajustes. */
  types: z
    .string()
    .optional()
    .transform((value) => value?.split(",").filter(Boolean))
    .pipe(z.array(safeMovementTypeSchema).optional()),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
  search: z.string().trim().optional(),
  createdAtFrom: z.coerce.date().optional(),
  createdAtTo: z.coerce.date().optional(),
});

export type ListSafeMovementsInput = z.infer<typeof listSafeMovementsSchema>;
