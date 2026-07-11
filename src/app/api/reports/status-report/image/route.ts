import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportSummarySchema } from "@/features/reports/application/dtos/get-status-report-summary.dto";
import { getStatusReportSummaryUseCase } from "@/features/reports/application/get-status-report-summary.use-case";
import { renderStatusReportImage } from "@/features/reports/infrastructure/status-report-image";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";
import { PrismaPaymentMethodRepository } from "@/features/payment-methods/infrastructure/prisma-payment-method.repository";

const safeRepository = new PrismaSafeRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const accountsPayableRepository = new PrismaAccountsPayableRepository();
const categoryRepository = new PrismaCategoryRepository();
const paymentMethodRepository = new PrismaPaymentMethodRepository();

/** Serve o Status Report como PNG (1080x1920) — usado tanto pra preview (`<img>`) quanto pro download (mesma URL, `<a download>`). */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("gerar Status Report sem organização vinculada");
    }

    const { searchParams } = new URL(request.url);
    const input = getStatusReportSummarySchema.parse({
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
    });

    const summary = await getStatusReportSummaryUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      {
        safeRepository,
        safeMovementRepository,
        cashFlowEntryRepository,
        accountsPayableRepository,
        categoryRepository,
        paymentMethodRepository,
      },
    );

    const imageBuffer = await renderStatusReportImage(summary);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/reports/status-report/image",
    });
  }
}
