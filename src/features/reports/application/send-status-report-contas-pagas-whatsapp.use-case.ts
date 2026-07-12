import { logger } from "@/core/logger/logger";
import {
  ReportWhatsAppSendError,
  WhatsAppNotConfiguredError,
} from "@/core/errors/domain-error";
import { formatDateOnlyBR } from "@/shared/lib/format";
import { getStatusReportContasPagasUseCase } from "./get-status-report-contas-pagas.use-case";
import { renderStatusReportContasPagasImage } from "../infrastructure/status-report-contas-pagas-image";
import { sendImageMessage } from "@/core/whatsapp/zapi-client";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  categoryRepository: CategoryRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
}

/**
 * Gera a imagem do Status Report: Contas Pagas e envia por WhatsApp via
 * Z-API `/send-image` — mesmo padrão do Status Report genérico
 * (`send-status-report-whatsapp.use-case.ts`). Não persiste nada.
 */
export async function sendStatusReportContasPagasWhatsAppUseCase(
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

  const summary = await getStatusReportContasPagasUseCase(
    organizationId,
    dateFrom,
    dateTo,
    deps,
  );

  const imageBuffer = await renderStatusReportContasPagasImage(summary);
  const base64Image = `data:image/png;base64,${Buffer.from(imageBuffer).toString("base64")}`;

  try {
    await sendImageMessage({
      phone: settings.whatsapp,
      image: base64Image,
      caption: `Status Report: Contas Pagas — ${formatDateOnlyBR(dateFrom)} a ${formatDateOnlyBR(dateTo)}`,
    });
  } catch (error) {
    logger.error("Falha ao enviar Status Report: Contas Pagas por WhatsApp", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ReportWhatsAppSendError("status-report-contas-pagas");
  }

  logger.info("Status Report: Contas Pagas enviado por WhatsApp", {
    organizationId,
  });
}
