import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getSafePeriodSummarySchema } from "@/features/treasury/application/dtos/get-safe-period-summary.dto";
import { toSafePeriodSummaryResponseDTO } from "@/features/treasury/application/dtos/safe-period-summary.response-dto";
import { getSafePeriodSummaryUseCase } from "@/features/treasury/application/get-safe-period-summary.use-case";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";

const safeRepository = new PrismaSafeRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();

/** Saldo inicial/final do período — Relatório de Cofre (Central de Relatórios). */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar relatório de Cofre sem organização vinculada",
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = getSafePeriodSummarySchema.parse(searchParams);

    const summary = await getSafePeriodSummaryUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      { safeRepository, safeMovementRepository },
    );

    return NextResponse.json({ data: toSafePeriodSummaryResponseDTO(summary) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/treasury/safe/period-summary",
    });
  }
}
