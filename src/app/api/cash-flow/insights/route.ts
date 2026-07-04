import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getCashFlowInsightsUseCase } from "@/features/cash-flow/application/get-cash-flow-insights.use-case";
import { toCashFlowInsightsResponseDTO } from "@/features/cash-flow/application/dtos/cash-flow-insights.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const categoryRepository = new PrismaCategoryRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_FLOW_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("consultar insights sem organização vinculada");
    }

    const insights = await getCashFlowInsightsUseCase(user.organizationId, {
      cashRegisterDayRepository,
      cashFlowEntryRepository,
      categoryRepository,
    });

    return NextResponse.json({ data: toCashFlowInsightsResponseDTO(insights) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-flow/insights",
    });
  }
}
