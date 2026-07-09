import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { toSafeMovementResponseDTO } from "@/features/treasury/application/dtos/safe-movement.response-dto";
import { confirmSafeMovementUseCase } from "@/features/treasury/application/confirm-safe-movement.use-case";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";

const safeMovementRepository = new PrismaSafeMovementRepository();

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.TREASURY_CONFIRM_MOVEMENT);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "confirmar movimentação do Cofre sem organização vinculada",
      );
    }

    const { id } = await params;

    const movement = await confirmSafeMovementUseCase(
      id,
      user.id,
      user.organizationId,
      { safeMovementRepository },
    );

    return NextResponse.json({ data: toSafeMovementResponseDTO(movement) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/treasury/movements/[id]/confirm",
    });
  }
}
