import { z } from "zod";
import {
  cuidSchema,
  moneyAmountSchema,
  dateOnlySchema,
  shortTextSchema,
} from "@/shared/lib/validators";

export const createAccountsPayableSchema = z.object({
  supplierId: cuidSchema,
  categoryId: cuidSchema,
  description: z.string().trim().min(1, "Informe a descrição").max(200),
  amount: moneyAmountSchema,
  dueDate: dateOnlySchema,
  barcode: shortTextSchema(100),
  digitableLine: shortTextSchema(100),
  pixKey: shortTextSchema(200),
  qrCodeUrl: shortTextSchema(500),
  boletoPdfUrl: shortTextSchema(500),
  recurringBillId: cuidSchema.optional(),
});

export type CreateAccountsPayableInput = z.infer<
  typeof createAccountsPayableSchema
>;
