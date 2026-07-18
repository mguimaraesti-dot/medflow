import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportContasPagasSchema } from "@/features/reports/application/dtos/get-status-report-contas-pagas.dto";
import { getStatusReportContasPagasUseCase } from "@/features/reports/application/get-status-report-contas-pagas.use-case";
import { renderStatusReportContasPagasPdf } from "@/features/reports/infrastructure/status-report-contas-pagas-pdf";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const categoryRepository = new PrismaCategoryRepository();

/** Serve o Relatório de Contas Pagas como PDF de múltiplas páginas — preview e download na mesma URL, mesmo padrão do Relatório de Recebimentos. */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "gerar Relatório de Contas Pagas sem organização vinculada",
      );
    }

    const { searchParams } = new URL(request.url);
    const input = getStatusReportContasPagasSchema.parse({
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
    });

    const summary = await getStatusReportContasPagasUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      {
        accountsPayableRepository,
        categoryRepository,
      },
    );

    const pdfBuffer = renderStatusReportContasPagasPdf(summary);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        // `inline` mantém o preview embutido (`<embed>`) funcionando —
        // só sugere o nome do arquivo pra quando o usuário exportar/
        // salvar (nosso botão "Baixar PDF" já usa esse nome via `download`,
        // mas o próprio visualizador de PDF do navegador tem sua própria
        // ação de salvar, que sem isso sugeria "pdf" — o último trecho
        // da URL, sem `Content-Disposition` nenhum).
        "Content-Disposition": 'inline; filename="relatorio-contas-pagas.pdf"',
      },
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/reports/status-report-contas-pagas/pdf",
    });
  }
}
