import { z } from "zod";
import {
  cuidSchema,
  moneyAmountSchema,
  dateOnlySchema,
  shortTextSchema,
} from "@/shared/lib/validators";

export const recurrenceInputSchema = z.object({
  periodicity: z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY", "YEARLY"]),
  // undefined = sem prazo (o use case decide o tamanho do lote gerado).
  maxOccurrences: z.number().int().positive().max(120).optional(),
});

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
  paymentOrigin: z.enum(["BANCO", "COFRE"]).default("BANCO"),
  recurringBillId: cuidSchema.optional(),
  /** Presente só quando "Conta recorrente" está marcada no cadastro. */
  recurrence: recurrenceInputSchema.optional(),
  /** Omitido = usa o default do banco (5). Dias antes do vencimento em que o lembrete de WhatsApp começa a ser enviado. */
  reminderDaysBefore: z.number().int().min(0).max(60).optional(),
});

export type CreateAccountsPayableInput = z.infer<
  typeof createAccountsPayableSchema
>;
export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>;
