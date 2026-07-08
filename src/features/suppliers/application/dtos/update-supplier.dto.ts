import { z } from "zod";

/** Mesmo shape de `createSupplierSchema`, sem `active` — inativar/reativar é sempre via rota dedicada, nunca junto de uma edição normal. */
export const updateSupplierSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do beneficiário").max(200),
  personType: z
    .enum(["PESSOA_FISICA", "PESSOA_JURIDICA"])
    .default("PESSOA_JURIDICA"),
  document: z.string().trim().max(30).optional(),
  contactName: z.string().trim().max(200).optional(),
  phone: z.string().trim().min(1, "Telefone é obrigatório").max(30),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  notes: z.string().trim().max(1000).optional(),
});

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
