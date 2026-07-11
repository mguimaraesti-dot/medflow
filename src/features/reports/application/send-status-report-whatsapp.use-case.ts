import { logger } from "@/core/logger/logger";
import {
  ReportWhatsAppSendError,
  WhatsAppNotConfiguredError,
} from "@/core/errors/domain-error";
import { formatDateOnlyBR } from "@/shared/lib/format";
import { getStatusReportSummaryUseCase } from "./get-status-report-summary.use-case";
import { renderStatusReportImage } from "../infrastructure/status-report-image";
import { sendImageMessage } from "@/core/whatsapp/zapi-client";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { PaymentMethodRepository } from "@/features/payment-methods/domain/payment-method.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

interface Deps {
  safeRepository: SafeRepository;
  safeMovementRepository: SafeMovementRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
  accountsPayableRepository: AccountsPayableRepository;
  categoryRepository: CategoryRepository;
  paymentMethodRepository: PaymentMethodRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
}

/**
 * Gera a imagem do Status Report (`next/og`, convertida pra base64) e
 * envia por WhatsApp via Z-API `/send-image` — botão "Enviar por
 * WhatsApp" da tela de Relatórios. Não persiste nada: é só
 * compartilhamento, sem auditoria de estado financeiro associada
 * (mesmo padrão já usado pelo extinto Relatório de Cofre).
 */
export async function sendStatusReportWhatsAppUseCase(
  organizationId: string,
  dateFrom: Date,
  dateTo: Date,
  deps: Deps,
): Promise<void> {
  const settings =
    await deps.organizationSettingsRepository.findByOrganization(
      organizationId,
    );
  if (!settings?.whatsapp) {
    throw new WhatsAppNotConfiguredError(organizationId);
  }

  const summary = await getStatusReportSummaryUseCase(
    organizationId,
    dateFrom,
    dateTo,
    deps,
  );

  const imageBuffer = await renderStatusReportImage(summary);
  const base64Image = `data:image/png;base64,${Buffer.from(imageBuffer).toString("base64")}`;

  try {
    await sendImageMessage({
      phone: settings.whatsapp,
      image: base64Image,
      caption: `Status Report — ${formatDateOnlyBR(dateFrom)} a ${formatDateOnlyBR(dateTo)}`,
    });
  } catch (error) {
    logger.error("Falha ao enviar Status Report por WhatsApp", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ReportWhatsAppSendError("status-report");
  }

  logger.info("Status Report enviado por WhatsApp", { organizationId });
}
