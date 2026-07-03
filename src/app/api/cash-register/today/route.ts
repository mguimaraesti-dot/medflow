import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { toCashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("consultar caixa sem organização vinculada");
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const cashRegisterDay =
      await cashRegisterDayRepository.findByOrganizationAndDate(
        user.organizationId,
        today,
      );

    return NextResponse.json({
      data: cashRegisterDay
        ? toCashRegisterDayResponseDTO(cashRegisterDay)
        : null,
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register/today",
    });
  }
}
