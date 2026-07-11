import { logger } from "@/core/logger/logger";
import { NotFoundError } from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { UserRepository } from "@/features/auth/domain/user.repository";
import type { WhatsAppMessagingPort } from "../domain/whatsapp-messaging.port";
import { WHATSAPP_SYSTEM_USER_EMAIL } from "../domain/whatsapp-system-user";
import { payAccountsPayableUseCase } from "./pay-accounts-payable.use-case";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  safeRepository: SafeRepository;
  userRepository: UserRepository;
  whatsAppMessaging: WhatsAppMessagingPort;
}

export interface HandleZapiWebhookInput {
  /** Telefone de quem clicou (pra mandar a confirmação de volta). */
  phone: string;
  /** Extraído do id do botão "Pago" clicado (`pago_<id>` — ver `route.ts`). */
  accountsPayableId: string;
}

/**
 * Confirma o pagamento a partir do clique no botão "Pago" enviado
 * junto do lembrete — o id da conta vem embutido no próprio id do
 * botão (`pago_<accountsPayableId>`), então não depende de casar
 * telefone (único por organização) nem mensagem citada.
 *
 * Idempotente: se a conta encontrada já não está PENDENTE, não faz
 * nada (2º clique não tem efeito colateral).
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

  logger.info("Pagamento confirmado via webhook Z-API (clique em Pago)", {
    accountsPayableId: payable.id,
    organizationId: payable.organizationId,
  });

  // Best-effort: o pagamento já foi confirmado, então uma falha só em
  // mandar o "obrigado" de volta nunca deve virar erro pro webhook.
  try {
    await deps.whatsAppMessaging.sendPaymentConfirmedMessage(input.phone);
  } catch (error) {
    logger.error("Falha ao enviar confirmação de pagamento por WhatsApp", {
      accountsPayableId: payable.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
