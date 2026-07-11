import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getSafePeriodSummarySchema } from "@/features/treasury/application/dtos/get-safe-period-summary.dto";
import { sendSafePeriodReportWhatsAppUseCase } from "@/features/treasury/application/send-safe-period-report-whatsapp.use-case";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const safeRepository = new PrismaSafeRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();

/** Botão "Enviar por WhatsApp" do Relatório de Cofre — gera a imagem-resumo e envia via Z-API. */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "enviar relatório de Cofre sem organização vinculada",
      );
    }

    const body = await request.json();
    const input = getSafePeriodSummarySchema.parse(body);

    await sendSafePeriodReportWhatsAppUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      {
        safeRepository,
        safeMovementRepository,
        organizationSettingsRepository,
      },
    );

    return NextResponse.json({ data: { sent: true } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/treasury/safe/period-summary/send-whatsapp",
    });
  }
}
