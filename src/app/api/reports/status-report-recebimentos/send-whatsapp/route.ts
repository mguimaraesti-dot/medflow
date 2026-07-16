import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportRecebimentosSchema } from "@/features/reports/application/dtos/get-status-report-recebimentos.dto";
import { sendStatusReportRecebimentosWhatsAppUseCase } from "@/features/reports/application/send-status-report-recebimentos-whatsapp.use-case";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const categoryRepository = new PrismaCategoryRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();

/** Botão "Enviar por WhatsApp" da tela do Relatório de Recebimentos — gera o PDF e envia como anexo de documento via Z-API. */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "enviar Relatório de Recebimentos sem organização vinculada",
      );
    }

    const body = await request.json();
    const input = getStatusReportRecebimentosSchema.parse(body);

    await sendStatusReportRecebimentosWhatsAppUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      {
        cashFlowEntryRepository,
        categoryRepository,
        organizationSettingsRepository,
      },
    );

    return NextResponse.json({ data: { sent: true } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/reports/status-report-recebimentos/send-whatsapp",
    });
  }
}
