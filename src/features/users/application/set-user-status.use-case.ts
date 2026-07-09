import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  CannotModifyOwnRoleError,
  LastActiveAdminError,
} from "@/core/errors/domain-error";
import type { UserManagementRepository } from "../domain/user-management.repository";
import type { ManagedUser } from "../domain/managed-user.entity";
import type { SetUserStatusInput } from "./dtos/set-user-status.dto";

interface Deps {
  userManagementRepository: UserManagementRepository;
}

export async function setUserStatusUseCase(
  id: string,
  input: SetUserStatusInput,
  actingUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<ManagedUser> {
  const target = await deps.userManagementRepository.findById(id);
  if (!target || target.organizationId !== organizationId) {
    throw new NotFoundError("Usuário", id);
  }

  if (id === actingUserId) {
    throw new CannotModifyOwnRoleError("status");
  }

  if (
    input.status === "INACTIVE" &&
    target.status === "ACTIVE" &&
    target.roleName === "ADMIN"
  ) {
    const remainingActiveAdmins =
      await deps.userManagementRepository.countActiveAdmins(id);
    if (remainingActiveAdmins === 0) {
      throw new LastActiveAdminError();
    }
  }

  const before = { status: target.status };
  const user = await deps.userManagementRepository.setStatus(id, input.status);

  await prisma.auditLog.create({
    data: {
      userId: actingUserId,
      entity: "User",
      entityId: user.id,
      action: "UPDATE",
      reason:
        input.status === "INACTIVE"
          ? "Usuário desativado"
          : "Usuário reativado",
      before,
      after: { status: user.status },
    },
  });

  logger.info("Status de usuário alterado", {
    organizationId,
    userId: user.id,
    status: user.status,
  });

  return user;
}
