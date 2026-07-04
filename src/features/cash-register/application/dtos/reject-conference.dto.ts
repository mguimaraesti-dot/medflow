import { z } from "zod";

export const rejectConferenceSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "A justificativa precisa ter pelo menos 10 caracteres"),
});

export type RejectConferenceInput = z.infer<typeof rejectConferenceSchema>;
