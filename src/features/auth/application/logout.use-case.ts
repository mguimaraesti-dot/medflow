import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/core/database/prisma.client";
import { getSessionUser } from "@/core/auth/session";
import type { RequestMeta } from "./login.use-case";

export async function logoutUseCase(
  deps: { supabase: SupabaseClient },
  meta: RequestMeta = {},
): Promise<void> {
  const user = await getSessionUser();

  await deps.supabase.auth.signOut();

  if (user) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entity: "User",
        entityId: user.id,
        action: "LOGOUT",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  }
}
