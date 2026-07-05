import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getCashRegisterDayDetailUseCase } from "@/features/cash-register/application/get-cash-register-day-detail.use-case";
import { toCashRegisterDayDetailResponseDTO } from "@/features/cash-register/application/dtos/get-cash-register-day-detail.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar detalhe de fechamento sem organização vinculada",
      );
    }

    const { id } = await params;
    const detail = await getCashRegisterDayDetailUseCase(
      id,
      user.organizationId,
      {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
        safeMovementRepository,
      },
    );

    return NextResponse.json({
      data: toCashRegisterDayDetailResponseDTO(detail),
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register/[id]",
    });
  }
}
