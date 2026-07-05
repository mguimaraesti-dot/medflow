import { z } from "zod";

export const deleteAccountsPayableSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type DeleteAccountsPayableInput = z.infer<
  typeof deleteAccountsPayableSchema
>;
