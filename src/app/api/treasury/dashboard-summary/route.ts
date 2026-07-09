import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getTreasuryDashboardSummaryUseCase } from "@/features/treasury/application/get-treasury-dashboard-summary.use-case";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";

const safeRepository = new PrismaSafeRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar indicadores da Tesouraria sem organização vinculada",
      );
    }

    const fromParam = request.nextUrl.searchParams.get("from");
    const toParam = request.nextUrl.searchParams.get("to");
    const range =
      fromParam && toParam
        ? { from: new Date(fromParam), to: new Date(toParam) }
        : undefined;

    const summary = await getTreasuryDashboardSummaryUseCase(
      user.organizationId,
      { safeRepository, safeMovementRepository },
      range,
    );

    return NextResponse.json({ data: summary });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/treasury/dashboard-summary",
    });
  }
}
