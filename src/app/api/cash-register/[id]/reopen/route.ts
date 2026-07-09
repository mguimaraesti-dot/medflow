import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { generateRequestId } from "@/core/utils/request-id";
import { reopenCashRegisterSchema } from "@/features/cash-register/application/dtos/reopen-cash-register.dto";
import { reopenCashRegisterUseCase } from "@/features/cash-register/application/reopen-cash-register.use-case";
import { toCashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_REOPEN);
    const { id } = await params;

    const body = await request.json();
    const input = reopenCashRegisterSchema.parse(body);

    const result = await reopenCashRegisterUseCase(id, input, user.id, {
      cashRegisterDayRepository,
      safeMovementRepository,
    });

    return NextResponse.json({ data: toCashRegisterDayResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register/[id]/reopen",
      useCase: "reopenCashRegisterUseCase",
    });
  }
}
