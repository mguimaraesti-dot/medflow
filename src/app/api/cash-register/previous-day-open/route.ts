import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getPreviousDayOpenRegisterUseCase } from "@/features/cash-register/application/get-previous-day-open-register.use-case";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
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
      { cashRegisterDayRepository, organizationSettingsRepository },
    );

    return NextResponse.json({ data: previousDayOpenRegister });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register/previous-day-open",
    });
  }
}
