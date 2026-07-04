import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getDashboardAlertsUseCase } from "@/features/dashboard/application/get-dashboard-alerts.use-case";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("consultar alertas sem organização vinculada");
    }

    const result = await getDashboardAlertsUseCase(user.organizationId, {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      organizationSettingsRepository,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/dashboard/alerts" });
  }
}
