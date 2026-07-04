import { z } from "zod";
import { cuidSchema } from "@/shared/lib/validators";

export const payAccountsPayableSchema = z.object({
  paymentMethodId: cuidSchema,
});

export type PayAccountsPayableInput = z.infer<typeof payAccountsPayableSchema>;
