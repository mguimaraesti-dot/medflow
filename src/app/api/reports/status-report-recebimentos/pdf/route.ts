import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportRecebimentosSchema } from "@/features/reports/application/dtos/get-status-report-recebimentos.dto";
import { getStatusReportRecebimentosUseCase } from "@/features/reports/application/get-status-report-recebimentos.use-case";
import { renderStatusReportRecebimentosPdf } from "@/features/reports/infrastructure/status-report-recebimentos-pdf";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";

const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const categoryRepository = new PrismaCategoryRepository();

/** Serve o Relatório de Recebimentos como PDF de múltiplas páginas — preview e download na mesma URL, mesmo padrão dos outros Status Reports. */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "gerar Relatório de Recebimentos sem organização vinculada",
      );
    }

    const { searchParams } = new URL(request.url);
    const input = getStatusReportRecebimentosSchema.parse({
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
    });

    const summary = await getStatusReportRecebimentosUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      { cashFlowEntryRepository, categoryRepository },
    );

    const pdfBuffer = renderStatusReportRecebimentosPdf(summary);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/reports/status-report-recebimentos/pdf",
    });
  }
}
