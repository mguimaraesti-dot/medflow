import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportCofreSchema } from "@/features/reports/application/dtos/get-status-report-cofre.dto";
import { sendStatusReportCofreWhatsAppUseCase } from "@/features/reports/application/send-status-report-cofre-whatsapp.use-case";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const categoryRepository = new PrismaCategoryRepository();
const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();

/** Botão "Enviar por WhatsApp" da tela do Status Report do Cofre — gera a imagem e envia via Z-API. */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "enviar Status Report do Cofre sem organização vinculada",
      );
    }

    const body = await request.json();
    const input = getStatusReportCofreSchema.parse(body);

    await sendStatusReportCofreWhatsAppUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      {
        cashFlowEntryRepository,
        categoryRepository,
        cashRegisterDayRepository,
        organizationSettingsRepository,
      },
    );

    return NextResponse.json({ data: { sent: true } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/reports/status-report-cofre/send-whatsapp",
    });
  }
}
