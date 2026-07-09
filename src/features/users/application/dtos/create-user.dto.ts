import { z } from "zod";
import { cuidSchema } from "@/shared/lib/validators";

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  roleId: cuidSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
