import { logger } from "@/core/logger/logger";
import { NotFoundError } from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { UserRepository } from "@/features/auth/domain/user.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { WhatsAppMessagingPort } from "../domain/whatsapp-messaging.port";
import { WHATSAPP_SYSTEM_USER_EMAIL } from "../domain/whatsapp-system-user";
import { payAccountsPayableUseCase } from "./pay-accounts-payable.use-case";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  safeRepository: SafeRepository;
  userRepository: UserRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
  whatsAppMessaging: WhatsAppMessagingPort;
}

export interface HandleZapiWebhookInput {
  /** Extraído do id do botão "Pago" clicado (`pago_<id>` — ver `route.ts`). */
  accountsPayableId: string;
}

export interface HandleZapiReactionWebhookInput {
  /** Id da mensagem ORIGINAL reagida (`reaction.referencedMessage.messageId` do payload do webhook) — casado contra `AccountsPayable.lastReminderMessageId` pra achar a conta. Não confundir com o id da PRÓPRIA reação. */
  referencedMessageId: string;
}

/**
 * Núcleo da confirmação de pagamento via webhook — reaproveitado pelos
 * DOIS gatilhos (clique no botão "Pagar" e reação 👍 no lembrete, ver
 * `handleZapiWebhookUseCase` e `handleZapiReactionWebhookUseCase`
 * abaixo). Quem chama já garantiu `payable.status === "PENDING"`.
 *
 * A baixa acontece silenciosamente no sistema — decisão de produto:
 * nenhuma mensagem NOVA de confirmação é enviada de volta ao WhatsApp.
 * O único feedback visual é uma reação ✅ na própria mensagem do
 * lembrete (bloco final abaixo) — best-effort, nunca derruba a baixa.
 *
 * IMPORTANTE (anti-loop do gatilho por reação): a confirmação usa ✅
 * (não 👍) DE PROPÓSITO — o gatilho novo só dispara em 👍
 * (`handleZapiReactionWebhookUseCase`), então a própria reação do
 * sistema nunca é confundida com um clique/reação de cliente, mesmo se
 * o campo `fromMe` do webhook não vier confiável pra reações enviadas
 * pela própria instância (não testado a fundo ainda — ver
 * `route.ts`). Segunda camada de proteção, independente do `fromMe`.
 */
async function confirmPayableFromWebhook(
  payable: AccountsPayable,
  triggerLabel: string,
  deps: Deps,
): Promise<void> {
  const systemUser = await deps.userRepository.findByEmail(
    WHATSAPP_SYSTEM_USER_EMAIL,
  );
  if (!systemUser) {
    throw new NotFoundError(
      "Usuário de sistema do WhatsApp",
      WHATSAPP_SYSTEM_USER_EMAIL,
    );
  }

  await payAccountsPayableUseCase(
    payable.id,
    systemUser.id,
    payable.organizationId,
    {
      accountsPayableRepository: deps.accountsPayableRepository,
      safeRepository: deps.safeRepository,
    },
    "WHATSAPP",
  );

  logger.info(`Pagamento confirmado via webhook Z-API (${triggerLabel})`, {
    accountsPayableId: payable.id,
    organizationId: payable.organizationId,
  });

  // Reação ✅ na mensagem original do lembrete — feedback visual sem
  // gerar mensagem nova no chat. BEST-EFFORT de propósito: a baixa já
  // aconteceu e é o que importa; se a reação falhar (ou não houver
  // `lastReminderMessageId` — ex.: baixa manual sem lembrete enviado),
  // só loga um aviso e segue, nunca propaga erro.
  if (payable.lastReminderMessageId) {
    try {
      const settings =
        await deps.organizationSettingsRepository.findByOrganization(
          payable.organizationId,
        );
      const destinationPhone =
        settings?.accountsPayableReminderWhatsapp || settings?.whatsapp;

      if (destinationPhone) {
        await deps.whatsAppMessaging.reactToPaymentConfirmed({
          phone: destinationPhone,
          messageId: payable.lastReminderMessageId,
        });
      }
    } catch (error) {
      logger.warn(
        "Webhook Z-API: falha ao reagir à mensagem do lembrete (best-effort — baixa já confirmada)",
        {
          accountsPayableId: payable.id,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}

/**
 * Confirma o pagamento a partir do clique no botão "Pagar" enviado
 * junto do lembrete — o id da conta vem embutido no próprio id do
 * botão (`pago_<accountsPayableId>`), então não depende de casar
 * telefone (único por organização) nem mensagem citada.
 *
 * Idempotente: se a conta encontrada já não está PENDENTE, não faz
 * nada (2º clique não tem efeito colateral) — e por isso também não
 * reage de novo (só reage quando a baixa acontece de verdade aqui).
 */
export async function handleZapiWebhookUseCase(
  input: HandleZapiWebhookInput,
  organizationId: string,
  deps: Deps,
): Promise<void> {
  const payable = await deps.accountsPayableRepository.findById(
    input.accountsPayableId,
  );

  if (!payable || payable.organizationId !== organizationId) {
    logger.warn(
      "Webhook Z-API: conta não encontrada (id do botão) ou de outra organização — ignorado",
      { accountsPayableId: input.accountsPayableId, organizationId },
    );
    return;
  }

  if (payable.status !== "PENDING") {
    logger.info("Webhook Z-API ignorado: conta já não está pendente", {
      accountsPayableId: payable.id,
      status: payable.status,
    });
    return;
  }

  await confirmPayableFromWebhook(payable, "clique em Pago", deps);
}

/**
 * Confirma o pagamento a partir de uma reação 👍 na mensagem do
 * lembrete — gatilho ADICIONAL ao clique no botão (`handleZapiWebhookUseCase`
 * acima), os dois coexistem. A conta é achada casando o `referencedMessageId`
 * (mensagem original reagida) contra `AccountsPayable.lastReminderMessageId`.
 *
 * As salvaguardas de "é reação de verdade / emoji é 👍 / não é a reação
 * do próprio sistema" já rodaram em `route.ts` antes de chegar aqui —
 * este use case só cuida de achar a conta certa e aplicar a MESMA
 * idempotência (status PENDING) do fluxo de botão, reaproveitando o
 * núcleo `confirmPayableFromWebhook`.
 */
export async function handleZapiReactionWebhookUseCase(
  input: HandleZapiReactionWebhookInput,
  organizationId: string,
  deps: Deps,
): Promise<void> {
  const payable =
    await deps.accountsPayableRepository.findByLastReminderMessageId(
      input.referencedMessageId,
    );

  if (!payable || payable.organizationId !== organizationId) {
    logger.info(
      "Webhook Z-API (reação 👍): mensagem reagida não corresponde a nenhum lembrete conhecido — ignorado",
      { referencedMessageId: input.referencedMessageId },
    );
    return;
  }

  if (payable.status !== "PENDING") {
    logger.info(
      "Webhook Z-API (reação 👍) ignorado: conta já não está pendente (idempotência)",
      { accountsPayableId: payable.id, status: payable.status },
    );
    return;
  }

  await confirmPayableFromWebhook(payable, "reação 👍 no lembrete", deps);
}
