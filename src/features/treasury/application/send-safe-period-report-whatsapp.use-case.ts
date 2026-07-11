import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  ReportWhatsAppSendError,
  WhatsAppNotConfiguredError,
} from "@/core/errors/domain-error";
import { formatDateOnlyBR } from "@/shared/lib/format";
import { getSafePeriodSummaryUseCase } from "./get-safe-period-summary.use-case";
import { renderSafePeriodReportImage } from "../infrastructure/safe-period-report-image";
import { sendImageMessage } from "@/core/whatsapp/zapi-client";
import type { SafeRepository } from "../domain/safe.repository";
import type { SafeMovementRepository } from "../domain/safe-movement.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

interface Deps {
  safeRepository: SafeRepository;
  safeMovementRepository: SafeMovementRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
}

/**
 * Gera a imagem-resumo do Relatório de Cofre (`next/og`, convertida pra
 * base64) e envia por WhatsApp via Z-API `/send-image` — botão "Enviar
 * por WhatsApp" da Central de Relatórios. Não persiste nada (diferente
 * do lembrete de Contas a Pagar): é só compartilhamento, sem auditoria
 * de estado financeiro associada.
 */
export async function sendSafePeriodReportWhatsAppUseCase(
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

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  const summary = await getSafePeriodSummaryUseCase(
    organizationId,
    dateFrom,
    dateTo,
    {
      safeRepository: deps.safeRepository,
      safeMovementRepository: deps.safeMovementRepository,
    },
  );

  const imageBuffer = await renderSafePeriodReportImage({
    organizationName: organization?.name ?? "MedFlow",
    dateFrom,
    dateTo,
    openingBalance: summary.openingBalance,
    closingBalance: summary.closingBalance,
    totalIn: summary.totalIn,
    totalOut: summary.totalOut,
  });
  const base64Image = `data:image/png;base64,${Buffer.from(imageBuffer).toString("base64")}`;

  try {
    await sendImageMessage({
      phone: settings.whatsapp,
      image: base64Image,
      caption: `Relatório de Cofre — ${formatDateOnlyBR(dateFrom)} a ${formatDateOnlyBR(dateTo)}`,
    });
  } catch (error) {
    logger.error("Falha ao enviar Relatório de Cofre por WhatsApp", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ReportWhatsAppSendError("safe-period-summary");
  }

  logger.info("Relatório de Cofre enviado por WhatsApp", { organizationId });
}
