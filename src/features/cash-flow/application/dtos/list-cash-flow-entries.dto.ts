import { z } from "zod";
import { paginationSchema } from "@/shared/lib/pagination";
import { cuidSchema } from "@/shared/lib/validators";

export const listCashFlowEntriesSchema = paginationSchema.extend({
  cashRegisterDayId: cuidSchema.optional(),
  type: z.enum(["IN", "OUT"]).optional(),
  categoryId: cuidSchema.optional(),
});

export type ListCashFlowEntriesInput = z.infer<
  typeof listCashFlowEntriesSchema
>;
