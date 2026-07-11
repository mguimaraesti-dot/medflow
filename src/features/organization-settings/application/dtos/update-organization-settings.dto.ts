import { z } from "zod";

/** String vazia vira `null` (limpar o campo) — só o WhatsApp é editável por enquanto. */
export const updateOrganizationSettingsSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .transform((value) => (value ? value : null)),
});

export type UpdateOrganizationSettingsInput = z.infer<
  typeof updateOrganizationSettingsSchema
>;
