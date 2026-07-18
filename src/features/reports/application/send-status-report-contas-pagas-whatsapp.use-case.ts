import { logger } from "@/core/logger/logger";
import {
  ReportWhatsAppSendError,
  WhatsAppNotConfiguredError,
} from "@/core/errors/domain-error";
import { formatDateOnlyBR } from "@/shared/lib/format";
import { getStatusReportContasPagasUseCase } from "./get-status-report-contas-pagas.use-case";
import { renderStatusReportContasPagasPdf } from "../infrastructure/status-report-contas-pagas-pdf";
import { sendDocumentMessage } from "@/core/whatsapp/zapi-client";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { CategoryRepository } from "@/features/categories/domain/category.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  categoryRepository: CategoryRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
}

/**
 * Gera o PDF do Relatório de Contas Pagas e envia por WhatsApp via Z-API
 * `/send-document/pdf` — mesmo padrão do Relatório de Recebimentos
 * (anexo de documento, não mais imagem — ver `sendDocumentMessage`). Não
 * persiste nada.
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

  const pdfBuffer = renderStatusReportContasPagasPdf(summary);
  const base64Document = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

  try {
    await sendDocumentMessage({
      phone: settings.whatsapp,
      document: base64Document,
      fileName: "relatorio-contas-pagas.pdf",
      caption: `Relatório de Contas Pagas — ${formatDateOnlyBR(dateFrom)} a ${formatDateOnlyBR(dateTo)}`,
    });
  } catch (error) {
    logger.error("Falha ao enviar Relatório de Contas Pagas por WhatsApp", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ReportWhatsAppSendError("status-report-contas-pagas");
  }

  logger.info("Relatório de Contas Pagas enviado por WhatsApp", {
    organizationId,
  });
}
