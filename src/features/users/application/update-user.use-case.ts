import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  CannotModifyOwnRoleError,
  LastActiveAdminError,
} from "@/core/errors/domain-error";
import type { UserManagementRepository } from "../domain/user-management.repository";
import type { ManagedUser } from "../domain/managed-user.entity";
import type { UpdateUserInput } from "./dtos/update-user.dto";

interface Deps {
  userManagementRepository: UserManagementRepository;
}

export async function updateUserUseCase(
  id: string,
  input: UpdateUserInput,
  actingUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<ManagedUser> {
  const target = await deps.userManagementRepository.findById(id);
  if (!target || target.organizationId !== organizationId) {
    throw new NotFoundError("Usuário", id);
  }

  const isRoleChange =
    input.roleId !== undefined && input.roleId !== target.roleId;

  if (isRoleChange && id === actingUserId) {
    throw new CannotModifyOwnRoleError();
  }

  // Só importa se o alvo é hoje um Admin ATIVO trocando de perfil —
  // mudar o perfil de quem já não é Admin (ou já está inativo) nunca
  // reduz a contagem de Admins ativos.
  if (
    isRoleChange &&
    target.status === "ACTIVE" &&
    target.roleName === "ADMIN"
  ) {
    const remainingActiveAdmins =
      await deps.userManagementRepository.countActiveAdmins(id);
    if (remainingActiveAdmins === 0) {
      throw new LastActiveAdminError();
    }
  }

  // Atribuir um perfil a um usuário PENDING é o próprio ato de
  // aprová-lo — sem isso, o Admin "atribui o perfil" mas o usuário
  // continua travado na tela de aguardando aprovação.
  const activatesPending =
    target.status === "PENDING" && input.roleId !== undefined;

  const before = {
    name: target.name,
    roleName: target.roleName,
    status: target.status,
  };
  const user = await deps.userManagementRepository.update(id, {
    ...input,
    ...(activatesPending && { status: "ACTIVE" }),
  });

  await prisma.auditLog.create({
    data: {
      userId: actingUserId,
      entity: "User",
      entityId: user.id,
      action: "UPDATE",
      before,
      after: { name: user.name, roleName: user.roleName, status: user.status },
    },
  });

  logger.info("Usuário atualizado", { organizationId, userId: user.id });

  return user;
}
