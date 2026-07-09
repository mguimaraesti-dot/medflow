import { prisma } from "@/core/database/prisma.client";
import type { Prisma } from "@prisma/client";
import type { UserRepository } from "../domain/user.repository";
import type { AuthenticatedUser } from "../domain/user.entity";

type UserWithRole = Prisma.UserGetPayload<{ include: { role: true } }>;

function toAuthenticatedUser(user: UserWithRole): AuthenticatedUser {
  return {
    id: user.id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    supabaseAuthId: user.supabaseAuthId,
    roleId: user.roleId,
    roleName: user.role?.name ?? null,
    status: user.status,
  };
}

export class PrismaUserRepository implements UserRepository {
  async findBySupabaseAuthId(
    supabaseAuthId: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await prisma.user.findUnique({
      where: { supabaseAuthId },
      include: { role: true },
    });
    return user ? toAuthenticatedUser(user) : null;
  }

  async findByEmail(email: string): Promise<AuthenticatedUser | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    return user ? toAuthenticatedUser(user) : null;
  }
}
