import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getCashFlowDailyTotalsSchema } from "@/features/cash-flow/application/dtos/get-cash-flow-daily-totals.dto";
import { toCashFlowDailyTotalsResponseDTO } from "@/features/cash-flow/application/dtos/cash-flow-daily-totals.response-dto";
import { getCashFlowDailyTotalsUseCase } from "@/features/cash-flow/application/get-cash-flow-daily-totals.use-case";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";

const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_FLOW_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar totais diários de receitas x despesas sem organização vinculada",
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = getCashFlowDailyTotalsSchema.parse(searchParams);

    const items = await getCashFlowDailyTotalsUseCase(
      input,
      user.organizationId,
      { cashFlowEntryRepository },
    );

    return NextResponse.json({ data: toCashFlowDailyTotalsResponseDTO(items) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-flow/daily-totals",
    });
  }
}
