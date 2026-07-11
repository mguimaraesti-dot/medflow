import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportContasPagasSchema } from "@/features/reports/application/dtos/get-status-report-contas-pagas.dto";
import { getStatusReportContasPagasUseCase } from "@/features/reports/application/get-status-report-contas-pagas.use-case";
import { renderStatusReportContasPagasImage } from "@/features/reports/infrastructure/status-report-contas-pagas-image";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const categoryRepository = new PrismaCategoryRepository();

/** Serve o Status Report: Contas Pagas como PNG (1080x1920) — mesmo padrão do Status Report genérico (preview + download na mesma URL). */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "gerar Status Report: Contas Pagas sem organização vinculada",
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

    const imageBuffer = await renderStatusReportContasPagasImage(summary);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/reports/status-report-contas-pagas/image",
    });
  }
}
