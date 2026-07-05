import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do fornecedor").max(200),
  document: z.string().trim().max(30).optional(),
  contactName: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
