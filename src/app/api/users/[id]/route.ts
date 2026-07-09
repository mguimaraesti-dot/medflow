import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { updateUserSchema } from "@/features/users/application/dtos/update-user.dto";
import { toUserResponseDTO } from "@/features/users/application/dtos/user.response-dto";
import { updateUserUseCase } from "@/features/users/application/update-user.use-case";
import { PrismaUserManagementRepository } from "@/features/users/infrastructure/prisma-user-management.repository";

const userManagementRepository = new PrismaUserManagementRepository();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.USERS_MANAGE);
    if (!user.organizationId) {
      throw new ForbiddenError("editar usuário sem organização vinculada");
    }
    const { id } = await params;

    const body = await request.json();
    const input = updateUserSchema.parse(body);

    const result = await updateUserUseCase(
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
      route: "/api/users/[id]",
      useCase: "updateUserUseCase",
    });
  }
}
