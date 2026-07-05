import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { confirmHandoffSchema } from "@/features/cash-register/application/dtos/confirm-handoff.dto";
import { confirmCashRegisterHandoffUseCase } from "@/features/cash-register/application/confirm-cash-register-handoff.use-case";
import { toCashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.TREASURY_CONFIRM_HANDOFF);
    if (!user.organizationId) {
      throw new ForbiddenError("confirmar handoff sem organização vinculada");
    }

    const body = await request.json().catch(() => ({}));
    const input = confirmHandoffSchema.parse(body);

    const result = await confirmCashRegisterHandoffUseCase(
      input,
      user.id,
      user.organizationId,
      { cashRegisterDayRepository, cashFlowEntryRepository },
    );

    return NextResponse.json({ data: toCashRegisterDayResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register/confirm-handoff",
      useCase: "confirmCashRegisterHandoffUseCase",
    });
  }
}
