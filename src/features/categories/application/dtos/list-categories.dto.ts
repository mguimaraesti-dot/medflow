import { z } from "zod";

export const listCategoriesSchema = z.object({
  type: z.enum(["IN", "OUT"]).optional(),
});

export type ListCategoriesInput = z.infer<typeof listCategoriesSchema>;
