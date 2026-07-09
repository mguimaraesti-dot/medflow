import { z } from "zod";
import { paginationSchema } from "@/shared/lib/pagination";
import { cuidSchema } from "@/shared/lib/validators";

export const listUsersSchema = paginationSchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional(),
  roleId: cuidSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;
