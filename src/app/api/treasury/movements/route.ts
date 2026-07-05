import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { listSafeMovementsSchema } from "@/features/treasury/application/dtos/list-safe-movements.dto";
import { toSafeMovementResponseDTO } from "@/features/treasury/application/dtos/safe-movement.response-dto";
import { listSafeMovementsUseCase } from "@/features/treasury/application/list-safe-movements.use-case";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";

const safeMovementRepository = new PrismaSafeMovementRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "listar movimentações do Cofre sem organização vinculada",
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = listSafeMovementsSchema.parse(searchParams);

    const result = await listSafeMovementsUseCase(input, user.organizationId, {
      safeMovementRepository,
    });

    return NextResponse.json({
      data: {
        ...result,
        items: result.items.map((item) => toSafeMovementResponseDTO(item)),
      },
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/treasury/movements",
    });
  }
}
