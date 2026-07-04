import { z } from "zod";

export const confirmHandoffSchema = z.object({
  receivedAmount: z
    .number()
    .nonnegative("Valor recebido não pode ser negativo")
    .multipleOf(0.01, "Use no máximo 2 casas decimais"),
});

export type ConfirmHandoffInput = z.infer<typeof confirmHandoffSchema>;
