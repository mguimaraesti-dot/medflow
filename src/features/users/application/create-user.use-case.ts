import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  UserEmailAlreadyExistsError,
} from "@/core/errors/domain-error";
import type { UserManagementRepository } from "../domain/user-management.repository";
import type { ManagedUser } from "../domain/managed-user.entity";
import type { CreateUserInput } from "./dtos/create-user.dto";

interface Deps {
  userManagementRepository: UserManagementRepository;
  supabaseAdmin: SupabaseClient;
}

/**
 * Convida um usuário novo (Supabase Auth envia o e-mail com o link
 * pra ele definir a própria senha). O trigger `handle_new_auth_user`
 * já cria a linha PENDING em `users` assim que o convite é emitido —
 * aqui só enriquecemos essa linha (nome/perfil) e a ativamos.
 */
export async function createUserUseCase(
  input: CreateUserInput,
  createdByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<ManagedUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new UserEmailAlreadyExistsError(input.email);
  }

  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role) {
    throw new NotFoundError("Perfil", input.roleId);
  }

  const { data, error } = await deps.supabaseAdmin.auth.admin.inviteUserByEmail(
    input.email,
  );

  if (error || !data.user) {
    throw new Error(
      `Falha ao convidar usuário no Supabase Auth: ${error?.message}`,
    );
  }

  const user = await deps.userManagementRepository.finalizeInvite(
    data.user.id,
    { name: input.name, roleId: input.roleId, organizationId },
  );

  await prisma.auditLog.create({
    data: {
      userId: createdByUserId,
      entity: "User",
      entityId: user.id,
      action: "CREATE",
      after: { name: user.name, email: user.email, roleName: role.name },
    },
  });

  logger.info("Usuário convidado", {
    organizationId,
    userId: user.id,
    roleName: role.name,
  });

  return user;
}
