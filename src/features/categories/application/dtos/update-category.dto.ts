import { z } from "zod";

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria").max(100),
  type: z.enum(["IN", "OUT"]),
  color: z.string().trim().min(1, "Selecione uma cor"),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
