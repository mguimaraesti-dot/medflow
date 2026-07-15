import { z } from "zod";

/** String vazia vira `null` (limpar o campo) — WhatsApp e horário do lembrete são os únicos editáveis por enquanto. */
export const updateOrganizationSettingsSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .transform((value) => (value ? value : null)),
  accountsPayableReminderWhatsapp: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .transform((value) => (value ? value : null)),
  reminderSendHour: z.number().int().min(0).max(23),
});

export type UpdateOrganizationSettingsInput = z.infer<
  typeof updateOrganizationSettingsSchema
>;
