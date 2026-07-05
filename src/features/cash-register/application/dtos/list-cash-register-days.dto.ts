import { z } from "zod";
import { paginationSchema } from "@/shared/lib/pagination";

export const listCashRegisterDaysSchema = paginationSchema.extend({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type ListCashRegisterDaysInput = z.infer<
  typeof listCashRegisterDaysSchema
>;
