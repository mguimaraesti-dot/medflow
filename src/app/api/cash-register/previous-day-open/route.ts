import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getPreviousDayOpenRegisterUseCase } from "@/features/cash-register/application/get-previous-day-open-register.use-case";
import { toCashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("consultar caixa sem organização vinculada");
    }

    const previousDayOpenRegister = await getPreviousDayOpenRegisterUseCase(
      user.organizationId,
      {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
        safeMovementRepository,
        organizationSettingsRepository,
      },
    );

    return NextResponse.json({
      data: previousDayOpenRegister
        ? toCashRegisterDayResponseDTO(previousDayOpenRegister)
        : null,
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register/previous-day-open",
    });
  }
}
