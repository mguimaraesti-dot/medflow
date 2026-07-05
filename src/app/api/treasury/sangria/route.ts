import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { requestSangriaSchema } from "@/features/treasury/application/dtos/request-sangria.dto";
import { toSafeMovementResponseDTO } from "@/features/treasury/application/dtos/safe-movement.response-dto";
import { requestSangriaUseCase } from "@/features/treasury/application/request-sangria.use-case";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";

const safeRepository = new PrismaSafeRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();
const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.TREASURY_SANGRIA);
    if (!user.organizationId) {
      throw new ForbiddenError("solicitar sangria sem organização vinculada");
    }

    const body = await request.json().catch(() => ({}));
    const input = requestSangriaSchema.parse(body);

    const movement = await requestSangriaUseCase(
      input,
      user.id,
      user.organizationId,
      {
        safeRepository,
        safeMovementRepository,
        cashRegisterDayRepository,
      },
    );

    return NextResponse.json(
      { data: toSafeMovementResponseDTO(movement) },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/treasury/sangria" });
  }
}
