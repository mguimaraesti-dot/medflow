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
 * Hora atual (0-23) no timezone informado — usada pra comparar com
 * `OrganizationSettings.reminderSendHour`. A rota do cron não tem mais
 * um `schedule` do Vercel disparando 1x/dia (Hobby só permite cron
 * nativo diário, sem configuração dinâmica — ver comentário na rota);
 * um serviço externo chama a rota com frequência maior, e é essa
 * checagem que decide se é a hora certa de processar os lembretes.
 */
function currentHourInTimezone(timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hourCycle: "h23",
  });
  return Number(formatter.format(new Date()));
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
 * Núcleo do cron de lembretes (`app/api/cron/accounts-payable-reminders/route.ts`):
 * só processa quando a hora atual (no timezone da organização) bate com
 * `OrganizationSettings.reminderSendHour` — a rota pode ser chamada com
 * qualquer frequência (ex: de hora em hora, por um serviço de cron
 * externo), essa checagem que garante que o disparo real só acontece
 * uma vez por dia, na hora configurada. Depois disso, busca as contas
 * pendentes da organização, filtra em código (mesmo padrão de agregação
 * já usado no projeto) quem já entrou na janela de antecedência (`hoje
 * >= dueDate - reminderDaysBefore`) e ainda não recebeu lembrete hoje —
 * essa segunda checagem é o que torna seguro chamar a rota várias vezes
 * dentro da mesma hora sem duplicar o envio. Uma conta com falha no
 * envio não interrompe as demais (log do erro, segue o lote).
 *
 * O telefone é único por organização (`OrganizationSettings.whatsapp`),
 * então quando o lote tem mais de 1 conta due, todas caem no mesmo
 * número, em sequência — sem mensagem separadora entre elas.
 */
export async function runAccountsPayableRemindersUseCase(
  organizationId: string,
  deps: Deps,
): Promise<RunAccountsPayableRemindersResult> {
  const settings =
    await deps.organizationSettingsRepository.findByOrganization(
      organizationId,
    );

  // Sem settings, cai no default (7h) já embutido no schema — mas sem
  // registro nenhum de OrganizationSettings a organização não tem nem
  // WhatsApp configurado, então não há pra quem enviar de qualquer jeito.
  if (!settings) {
    return { sentCount: 0, failedCount: 0 };
  }

  const currentHour = currentHourInTimezone(settings.timezone);
  if (currentHour !== settings.reminderSendHour) {
    return { sentCount: 0, failedCount: 0 };
  }

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
