import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getCashRegisterPeriodSummarySchema } from "@/features/cash-flow/application/dtos/get-cash-register-period-summary.dto";
import { toCashRegisterPeriodSummaryResponseDTO } from "@/features/cash-flow/application/dtos/cash-register-period-summary.response-dto";
import { getCashRegisterPeriodSummaryUseCase } from "@/features/cash-flow/application/get-cash-register-period-summary.use-case";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";

const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();

/** Totais consolidados do período (Dinheiro/PIX/Saídas) — Relatório de Caixa Recepção (Central de Relatórios). */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_FLOW_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar relatório de Caixa Recepção sem organização vinculada",
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = getCashRegisterPeriodSummarySchema.parse(searchParams);

    const summary = await getCashRegisterPeriodSummaryUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      { cashFlowEntryRepository },
    );

    return NextResponse.json({
      data: toCashRegisterPeriodSummaryResponseDTO(summary),
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-flow/period-summary",
    });
  }
}
