import { z } from "zod";
import { cuidSchema, moneyAmountSchema } from "@/shared/lib/validators";

/**
 * Exportado à parte (em vez de só `createCashFlowEntrySchema`) porque é
 * um `ZodObject` puro — o formulário precisa de `.omit({ occurredAt })`
 * antes de aplicar as mesmas regras condicionais, e `.omit()` não existe
 * mais depois do `.refine()` (vira `ZodEffects`).
 */
export const baseCreateCashFlowEntrySchema = z.object({
  type: z.enum(["IN", "OUT"]),
  amount: moneyAmountSchema,
  categoryId: cuidSchema,
  paymentMethodId: cuidSchema,
  description: z.string().trim().max(500).optional(),
  // Sempre maiúsculo — cada secretária digitava de um jeito (maiúsculo,
  // minúsculo, misto) e isso deixava o Relatório de Caixa Recepção
  // inconsistente. Normalizado aqui (schema compartilhado com o
  // frontend) para não depender de disciplina de digitação.
  patientName: z
    .string()
    .trim()
    .max(200)
    .transform((value) => value.toUpperCase())
    .optional(),
  withdrawalReason: z.string().trim().max(500).optional(),
  // Se omitido, o use case usa o horário atual do servidor.
  occurredAt: z.coerce.date().optional(),
});

/**
 * Nome do paciente (Entrada) e justificativa da retirada (Saída) são
 * obrigatórios conforme o tipo do lançamento (Refinamento UX Caixa
 * Recepção) — validado aqui via `.refine()` em vez de tornar os campos
 * base obrigatórios, já que cada um só se aplica a um dos dois tipos.
 */
export const createCashFlowEntrySchema = baseCreateCashFlowEntrySchema
  .refine((data) => data.type !== "IN" || Boolean(data.patientName), {
    path: ["patientName"],
    message: "Informe o nome do paciente",
  })
  .refine((data) => data.type !== "OUT" || Boolean(data.withdrawalReason), {
    path: ["withdrawalReason"],
    message: "Informe a justificativa da retirada",
  });

export type CreateCashFlowEntryInput = z.infer<
  typeof createCashFlowEntrySchema
>;
