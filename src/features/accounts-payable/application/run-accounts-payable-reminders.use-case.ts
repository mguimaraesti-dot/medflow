import { logger } from "@/core/logger/logger";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { SupplierRepository } from "@/features/suppliers/domain/supplier.repository";
import type { WhatsAppMessagingPort } from "../domain/whatsapp-messaging.port";
import { sendAccountsPayableWhatsAppReminderUseCase } from "./send-accounts-payable-whatsapp-reminder.use-case";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
  supplierRepository: SupplierRepository;
  whatsAppMessaging: WhatsAppMessagingPort;
}

export interface RunAccountsPayableRemindersResult {
  sentCount: number;
  failedCount: number;
}

function isSameUTCDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * `dueDate` já é meia-noite UTC (campo `@db.Date`) — subtrair dias em
 * UTC preserva isso, sem risco do fuso deslocar o dia (mesmo cuidado
 * de `formatDateOnlyBR`/`toAccountsPayableResponseDTO`).
 */
function reminderWindowStart(dueDate: Date, reminderDaysBefore: number): Date {
  const start = new Date(dueDate);
  start.setUTCDate(start.getUTCDate() - reminderDaysBefore);
  return start;
}

/**
 * Núcleo do cron diário (`app/api/cron/accounts-payable-reminders/route.ts`):
 * busca as contas pendentes da organização, filtra em código (mesmo
 * padrão de agregação em código já usado no projeto) quem já entrou na
 * janela de antecedência (`hoje >= dueDate - reminderDaysBefore`) e
 * ainda não recebeu lembrete hoje, e envia — pra cada uma. Uma conta
 * com falha no envio não interrompe as demais (log do erro, segue o
 * lote).
 */
export async function runAccountsPayableRemindersUseCase(
  organizationId: string,
  deps: Deps,
): Promise<RunAccountsPayableRemindersResult> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const candidates =
    await deps.accountsPayableRepository.listPendingForReminders(
      organizationId,
    );

  const due = candidates.filter((payable) => {
    const inWindow =
      today >= reminderWindowStart(payable.dueDate, payable.reminderDaysBefore);
    const alreadySentToday = payable.lastReminderSentAt
      ? isSameUTCDate(payable.lastReminderSentAt, today)
      : false;
    return inWindow && !alreadySentToday;
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const payable of due) {
    try {
      await sendAccountsPayableWhatsAppReminderUseCase(
        payable.id,
        organizationId,
        null,
        deps,
      );
      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      logger.error("Falha ao enviar lembrete do cron para uma conta", {
        organizationId,
        accountsPayableId: payable.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("Cron de lembretes de WhatsApp concluído", {
    organizationId,
    candidateCount: candidates.length,
    sentCount,
    failedCount,
  });

  return { sentCount, failedCount };
}
