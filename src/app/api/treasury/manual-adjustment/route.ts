import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { manualAdjustmentSchema } from "@/features/treasury/application/dtos/manual-adjustment.dto";
import { toSafeMovementResponseDTO } from "@/features/treasury/application/dtos/safe-movement.response-dto";
import { manualAdjustmentUseCase } from "@/features/treasury/application/manual-adjustment.use-case";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";

const safeRepository = new PrismaSafeRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(
      PERMISSIONS.TREASURY_MANUAL_ADJUSTMENT,
    );
    if (!user.organizationId) {
      throw new ForbiddenError("ajustar o Cofre sem organização vinculada");
    }

    const body = await request.json().catch(() => ({}));
    const input = manualAdjustmentSchema.parse(body);

    const movement = await manualAdjustmentUseCase(
      input,
      user.id,
      user.organizationId,
      {
        safeRepository,
        safeMovementRepository,
      },
    );

    return NextResponse.json(
      { data: toSafeMovementResponseDTO(movement) },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/treasury/manual-adjustment",
    });
  }
}
