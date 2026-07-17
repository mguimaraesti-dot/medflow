import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportSafeSchema } from "@/features/reports/application/dtos/get-status-report-safe.dto";
import { getStatusReportSafeUseCase } from "@/features/reports/application/get-status-report-safe.use-case";
import { renderStatusReportSafeImage } from "@/features/reports/infrastructure/status-report-safe-image";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";

const safeRepository = new PrismaSafeRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();

/** Serve o Relatório Executivo do Cofre como PNG (1080xN) — mesmo padrão dos outros Status Reports (preview + download na mesma URL). */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "gerar Relatório Executivo do Cofre sem organização vinculada",
      );
    }

    const { searchParams } = new URL(request.url);
    const input = getStatusReportSafeSchema.parse({
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
    });

    const summary = await getStatusReportSafeUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      {
        safeRepository,
        safeMovementRepository,
      },
    );

    const imageBuffer = await renderStatusReportSafeImage(summary);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/reports/status-report-safe/image",
    });
  }
}
