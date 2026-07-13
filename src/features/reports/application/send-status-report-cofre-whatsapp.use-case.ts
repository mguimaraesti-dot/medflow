import { logger } from "@/core/logger/logger";
import {
  ReportWhatsAppSendError,
  WhatsAppNotConfiguredError,
} from "@/core/errors/domain-error";
import { formatDateOnlyBR } from "@/shared/lib/format";
import { getStatusReportCofreUseCase } from "./get-status-report-cofre.use-case";
import { renderStatusReportCofreImage } from "../infrastructure/status-report-cofre-image";
import { sendImageMessage } from "@/core/whatsapp/zapi-client";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
  categoryRepository: CategoryRepository;
  cashRegisterDayRepository: CashRegisterDayRepository;
  safeMovementRepository: SafeMovementRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
}

/**
 * Gera a imagem do Relatório do Caixa Recepção e envia por WhatsApp via
 * Z-API `/send-image` — mesmo padrão dos outros Status Reports. Não
 * persiste nada.
 */
export async function sendStatusReportCofreWhatsAppUseCase(
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

  const summary = await getStatusReportCofreUseCase(
    organizationId,
    dateFrom,
    dateTo,
    deps,
  );

  const imageBuffer = await renderStatusReportCofreImage(summary);
  const base64Image = `data:image/png;base64,${Buffer.from(imageBuffer).toString("base64")}`;

  try {
    await sendImageMessage({
      phone: settings.whatsapp,
      image: base64Image,
      caption: `Relatório do Caixa Recepção — ${formatDateOnlyBR(dateFrom)} a ${formatDateOnlyBR(dateTo)}`,
    });
  } catch (error) {
    logger.error("Falha ao enviar Relatório do Caixa Recepção por WhatsApp", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ReportWhatsAppSendError("status-report-cofre");
  }

  logger.info("Relatório do Caixa Recepção enviado por WhatsApp", {
    organizationId,
  });
}
