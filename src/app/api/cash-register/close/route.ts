import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { closeCashRegisterUseCase } from "@/features/cash-register/application/close-cash-register.use-case";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();

export async function POST() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_CLOSE);
    if (!user.organizationId) {
      throw new ForbiddenError("fechar caixa sem organização vinculada");
    }

    const result = await closeCashRegisterUseCase(
      user.id,
      user.organizationId,
      {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
      },
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register/close",
      useCase: "closeCashRegisterUseCase",
    });
  }
}
