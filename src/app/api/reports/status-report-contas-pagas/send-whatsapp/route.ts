import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportContasPagasSchema } from "@/features/reports/application/dtos/get-status-report-contas-pagas.dto";
import { sendStatusReportContasPagasWhatsAppUseCase } from "@/features/reports/application/send-status-report-contas-pagas-whatsapp.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const categoryRepository = new PrismaCategoryRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();

/** Botão "Enviar por WhatsApp" da tela do Status Report: Contas Pagas — gera a imagem e envia via Z-API. */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "enviar Relatório de Contas Pagas sem organização vinculada",
      );
    }

    const body = await request.json();
    const input = getStatusReportContasPagasSchema.parse(body);

    await sendStatusReportContasPagasWhatsAppUseCase(
      user.organizationId,
      input.dateFrom,
      input.dateTo,
      {
        accountsPayableRepository,
        categoryRepository,
        organizationSettingsRepository,
      },
    );

    return NextResponse.json({ data: { sent: true } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/reports/status-report-contas-pagas/send-whatsapp",
    });
  }
}
