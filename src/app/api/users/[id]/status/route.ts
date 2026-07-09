import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { setUserStatusSchema } from "@/features/users/application/dtos/set-user-status.dto";
import { toUserResponseDTO } from "@/features/users/application/dtos/user.response-dto";
import { setUserStatusUseCase } from "@/features/users/application/set-user-status.use-case";
import { PrismaUserManagementRepository } from "@/features/users/infrastructure/prisma-user-management.repository";

const userManagementRepository = new PrismaUserManagementRepository();

/** Ativar/desativar (nunca exclui) — mesmo padrão de `setActive` de Beneficiários. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.USERS_MANAGE);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "alterar status de usuário sem organização vinculada",
      );
    }
    const { id } = await params;

    const body = await request.json();
    const input = setUserStatusSchema.parse(body);

    const result = await setUserStatusUseCase(
      id,
      input,
      user.id,
      user.organizationId,
      { userManagementRepository },
    );

    return NextResponse.json({ data: toUserResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/users/[id]/status",
      useCase: "setUserStatusUseCase",
    });
  }
}
