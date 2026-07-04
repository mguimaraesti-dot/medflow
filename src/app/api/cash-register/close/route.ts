import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { closeCashRegisterSchema } from "@/features/cash-register/application/dtos/close-cash-register.dto";
import { closeCashRegisterUseCase } from "@/features/cash-register/application/close-cash-register.use-case";
import { toCashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_CLOSE);
    if (!user.organizationId) {
      throw new ForbiddenError("fechar caixa sem organização vinculada");
    }

    const body = await request.json().catch(() => ({}));
    const input = closeCashRegisterSchema.parse(body);

    const result = await closeCashRegisterUseCase(
      input,
      user.id,
      user.organizationId,
      {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
        safeMovementRepository,
      },
    );

    return NextResponse.json({ data: toCashRegisterDayResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register/close",
      useCase: "closeCashRegisterUseCase",
    });
  }
}
