import { z } from "zod";

export const createSupplierSchema = z.object({
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

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
