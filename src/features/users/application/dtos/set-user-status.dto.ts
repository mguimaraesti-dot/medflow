import { z } from "zod";

export const setUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;
