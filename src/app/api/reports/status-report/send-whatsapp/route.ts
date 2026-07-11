import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getStatusReportSummarySchema } from "@/features/reports/application/dtos/get-status-report-summary.dto";
import { sendStatusReportWhatsAppUseCase } from "@/features/reports/application/send-status-report-whatsapp.use-case";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaSafeMovementRepository } from "@/features/treasury/infrastructure/prisma-safe-movement.repository";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";
import { PrismaPaymentMethodRepository } from "@/features/payment-methods/infrastructure/prisma-payment-method.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const safeRepository = new PrismaSafeRepository();
const safeMovementRepository = new PrismaSafeMovementRepository();
const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const accountsPayableRepository = new PrismaAccountsPayableRepository();
const categoryRepository = new PrismaCategoryRepository();
const paymentMethodRepository = new PrismaPaymentMethodRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();

/** Botão "Enviar por WhatsApp" da tela de Relatórios — gera a imagem do Status Report e envia via Z-API. */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.DASHBOARD_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "enviar Status Report sem organização vinculada",
      );
    }

    const body = await request.json();
    const input = getStatusReportSummarySchema.parse(body);

    await sendStatusReportWhatsAppUseCase(
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
        organizationSettingsRepository,
      },
    );

    return NextResponse.json({ data: { sent: true } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/reports/status-report/send-whatsapp",
    });
  }
}
