import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportSafeSchema } from "@/features/reports/application/dtos/get-status-report-safe.dto";
import { sendStatusReportSafeWhatsAppUseCase } from "@/features/reports/application/send-status-report-safe-whatsapp.use-case";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const safeRepository = new PrismaSafeRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();

/** Botão "Enviar por WhatsApp" da tela do Relatório Executivo do Cofre — gera a imagem e envia via Z-API. */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "enviar Relatório Executivo do Cofre sem organização vinculada",
      );
    }

    const body = await request.json();
    const input = getStatusReportSafeSchema.parse(body);

    await sendStatusReportSafeWhatsAppUseCase(
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
      route: "/api/reports/status-report-safe/send-whatsapp",
    });
  }
}
