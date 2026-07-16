import { logger } from "@/core/logger/logger";
import {
  ReportWhatsAppSendError,
  WhatsAppNotConfiguredError,
} from "@/core/errors/domain-error";
import { formatDateOnlyBR } from "@/shared/lib/format";
import { getStatusReportRecebimentosUseCase } from "./get-status-report-recebimentos.use-case";
import { renderStatusReportRecebimentosPdf } from "../infrastructure/status-report-recebimentos-pdf";
import { sendDocumentMessage } from "@/core/whatsapp/zapi-client";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
  categoryRepository: CategoryRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
}

/**
 * Gera o PDF do Relatório de Recebimentos e envia por WhatsApp via Z-API
 * `/send-document/pdf` — mesmo padrão dos outros Status Reports, mas como
 * anexo de documento em vez de imagem (ver `sendDocumentMessage`). Não
 * persiste nada. Destino é `settings.whatsapp` (o mesmo número usado pelo
 * Relatório do Caixa Recepção), nunca `accountsPayableReminderWhatsapp`
 * (que é exclusivo do lembrete de contas a pagar).
 */
export async function sendStatusReportRecebimentosWhatsAppUseCase(
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

  const summary = await getStatusReportRecebimentosUseCase(
    organizationId,
    dateFrom,
    dateTo,
    deps,
  );

  const pdfBuffer = renderStatusReportRecebimentosPdf(summary);
  const base64Document = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

  try {
    await sendDocumentMessage({
      phone: settings.whatsapp,
      document: base64Document,
      fileName: "relatorio-recebimentos.pdf",
      caption: `Relatório de Recebimentos — ${formatDateOnlyBR(dateFrom)} a ${formatDateOnlyBR(dateTo)}`,
    });
  } catch (error) {
    logger.error("Falha ao enviar Relatório de Recebimentos por WhatsApp", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ReportWhatsAppSendError("status-report-recebimentos");
  }

  logger.info("Relatório de Recebimentos enviado por WhatsApp", {
    organizationId,
  });
}
