import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { cancelConfirmedSafeMovementSchema } from "@/features/treasury/application/dtos/cancel-confirmed-safe-movement.dto";
import { toSafeMovementResponseDTO } from "@/features/treasury/application/dtos/safe-movement.response-dto";
import { cancelConfirmedSafeMovementUseCase } from "@/features/treasury/application/cancel-confirmed-safe-movement.use-case";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";

const safeMovementRepository = new PrismaSafeMovementRepository();

/**
 * Estorna uma `SafeMovement` já `CONFIRMED` (ex.: erro de digitação de
 * valor) — rota separada de `[id]/cancel` (que só rejeita `PENDING`),
 * mesma permissão de `manual-adjustment` (Admin/Owner): é uma correção
 * de lançamento já assentado, não uma conferência de rotina.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(
      PERMISSIONS.TREASURY_MANUAL_ADJUSTMENT,
    );
    if (!user.organizationId) {
      throw new ForbiddenError(
        "cancelar movimentação confirmada do Cofre sem organização vinculada",
      );
    }

    const { id } = await params;
    const body = await request.json();
    const input = cancelConfirmedSafeMovementSchema.parse(body);

    const movement = await cancelConfirmedSafeMovementUseCase(
      id,
      input,
      user.id,
      user.organizationId,
      { safeMovementRepository },
    );

    return NextResponse.json({ data: toSafeMovementResponseDTO(movement) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/treasury/movements/[id]/cancel-confirmed",
    });
  }
}
