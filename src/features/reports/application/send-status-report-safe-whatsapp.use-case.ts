import { logger } from "@/core/logger/logger";
import {
  ReportWhatsAppSendError,
  WhatsAppNotConfiguredError,
} from "@/core/errors/domain-error";
import { formatDateOnlyBR } from "@/shared/lib/format";
import { getStatusReportSafeUseCase } from "./get-status-report-safe.use-case";
import { renderStatusReportSafeImage } from "../infrastructure/status-report-safe-image";
import { sendImageMessage } from "@/core/whatsapp/zapi-client";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

interface Deps {
  safeRepository: SafeRepository;
  safeMovementRepository: SafeMovementRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
}

/**
 * Gera a imagem do Relatório Executivo do Cofre e envia por WhatsApp via
 * Z-API `/send-image` — mesmo padrão dos outros Status Reports. Não
 * persiste nada.
 */
export async function sendStatusReportSafeWhatsAppUseCase(
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

  const summary = await getStatusReportSafeUseCase(
    organizationId,
    dateFrom,
    dateTo,
    deps,
  );

  const imageBuffer = await renderStatusReportSafeImage(summary);
  const base64Image = `data:image/png;base64,${Buffer.from(imageBuffer).toString("base64")}`;

  try {
    await sendImageMessage({
      phone: settings.whatsapp,
      image: base64Image,
      caption: `Relatório Executivo do Cofre — ${formatDateOnlyBR(dateFrom)} a ${formatDateOnlyBR(dateTo)}`,
    });
  } catch (error) {
    logger.error("Falha ao enviar Relatório Executivo do Cofre por WhatsApp", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ReportWhatsAppSendError("status-report-safe");
  }

  logger.info("Relatório Executivo do Cofre enviado por WhatsApp", {
    organizationId,
  });
}
