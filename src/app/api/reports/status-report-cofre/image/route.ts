import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportCofreSchema } from "@/features/reports/application/dtos/get-status-report-cofre.dto";
import { getStatusReportCofreUseCase } from "@/features/reports/application/get-status-report-cofre.use-case";
import { renderStatusReportCofreImage } from "@/features/reports/infrastructure/status-report-cofre-image";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";

const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const accountsPayableRepository = new PrismaAccountsPayableRepository();
const categoryRepository = new PrismaCategoryRepository();
const safeRepository = new PrismaSafeRepository();

/** Serve o Status Report do Cofre como PNG (1080x1920) — mesmo padrão dos outros Status Reports (preview + download na mesma URL). */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "gerar Status Report do Cofre sem organização vinculada",
      );
    }

    const { searchParams } = new URL(request.url);
    const input = getStatusReportCofreSchema.parse({
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
    });

    const summary = await getStatusReportCofreUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      {
        cashFlowEntryRepository,
        accountsPayableRepository,
        categoryRepository,
        safeRepository,
      },
    );

    const imageBuffer = await renderStatusReportCofreImage(summary);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/reports/status-report-cofre/image",
    });
  }
}
