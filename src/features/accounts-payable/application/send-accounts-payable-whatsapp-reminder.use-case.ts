import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  PayableAlreadyProcessedError,
  WhatsAppNotConfiguredError,
  WhatsAppSendError,
} from "@/core/errors/domain-error";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { WhatsAppMessagingPort } from "../domain/whatsapp-messaging.port";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { SupplierRepository } from "@/features/suppliers/domain/supplier.repository";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
  supplierRepository: SupplierRepository;
  whatsAppMessaging: WhatsAppMessagingPort;
}

/**
 * Reaproveitada tanto pelo cron diário (`run-accounts-payable-reminders`)
 * quanto pelo botão "Enviar WhatsApp agora" — mesma operação, dois
 * gatilhos diferentes. `triggeredByUserId` é `null` quando quem chama é
 * o cron (sem usuário logado); o `AuditLog` aceita isso (`userId`
 * nullable).
 */
export async function sendAccountsPayableWhatsAppReminderUseCase(
  accountsPayableId: string,
  organizationId: string,
  triggeredByUserId: string | null,
  deps: Deps,
): Promise<void> {
  const payable =
    await deps.accountsPayableRepository.findById(accountsPayableId);
  if (!payable || payable.organizationId !== organizationId) {
    throw new NotFoundError("Conta a pagar", accountsPayableId);
  }
  if (payable.status !== "PENDING") {
    throw new PayableAlreadyProcessedError(payable.id);
  }

  const settings =
    await deps.organizationSettingsRepository.findByOrganization(
      organizationId,
    );
  const destinationPhone =
    settings?.accountsPayableReminderWhatsapp || settings?.whatsapp;
  if (!destinationPhone) {
    throw new WhatsAppNotConfiguredError(organizationId);
  }

  const supplier = await deps.supplierRepository.findById(payable.supplierId);
  if (!supplier) {
    throw new NotFoundError("Fornecedor", payable.supplierId);
  }

  let messageId: string | null;
  try {
    const result = await deps.whatsAppMessaging.sendPaymentReminder({
      accountsPayableId: payable.id,
      phone: destinationPhone,
      supplierName: supplier.name,
      description: payable.description,
      amount: formatCurrencyBRL(payable.amount.toString()),
      dueDate: formatDateOnlyBR(payable.dueDate),
      barcode: payable.barcode,
      pixKey: payable.pixKey,
    });
    messageId = result.messageId;
  } catch (error) {
    logger.error("Falha ao enviar lembrete de WhatsApp", {
      accountsPayableId: payable.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new WhatsAppSendError(payable.id);
  }

  const sentAt = new Date();
  await deps.accountsPayableRepository.touchReminderSent(
    payable.id,
    sentAt,
    messageId,
  );

  await prisma.auditLog.create({
    data: {
      userId: triggeredByUserId,
      entity: "AccountsPayable",
      entityId: payable.id,
      action: "WHATSAPP_REMINDER_SENT",
      after: { sentAt: sentAt.toISOString() },
    },
  });

  logger.info("Lembrete de WhatsApp enviado", {
    organizationId,
    accountsPayableId: payable.id,
    triggeredByUserId,
  });
}
