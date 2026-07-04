import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getDashboardSummaryUseCase } from "@/features/dashboard/application/get-dashboard-summary.use-case";
import { toDashboardSummaryResponseDTO } from "@/features/dashboard/application/dtos/dashboard-summary.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("consultar dashboard sem organização vinculada");
    }

    const summary = await getDashboardSummaryUseCase(user.organizationId, {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
    });

    return NextResponse.json({ data: toDashboardSummaryResponseDTO(summary) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/dashboard/summary",
    });
  }
}
