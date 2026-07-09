import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
