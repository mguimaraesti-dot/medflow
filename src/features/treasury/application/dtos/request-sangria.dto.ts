import { z } from "zod";
import { moneyAmountSchema, shortTextSchema } from "@/shared/lib/validators";

export const requestSangriaSchema = z.object({
  amount: moneyAmountSchema,
  reason: shortTextSchema(),
});

export type RequestSangriaInput = z.infer<typeof requestSangriaSchema>;
