import { z } from "zod";
import { cuidSchema } from "@/shared/lib/validators";

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(120).optional(),
  roleId: cuidSchema.optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
