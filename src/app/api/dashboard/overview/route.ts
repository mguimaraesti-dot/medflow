import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getDashboardOverviewUseCase } from "@/features/dashboard/application/get-dashboard-overview.use-case";
import { toDashboardOverviewResponseDTO } from "@/features/dashboard/application/dtos/dashboard-overview.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();
const safeRepository = new PrismaSafeRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();
const accountsPayableRepository = new PrismaAccountsPayableRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("consultar dashboard sem organização vinculada");
    }

    const overview = await getDashboardOverviewUseCase(user.organizationId, {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      safeMovementRepository,
      safeRepository,
      organizationSettingsRepository,
      accountsPayableRepository,
    });

    return NextResponse.json({
      data: toDashboardOverviewResponseDTO(overview),
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/dashboard/overview",
    });
  }
}
