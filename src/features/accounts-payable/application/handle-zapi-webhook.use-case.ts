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
  /** Telefone de quem enviou a mensagem (pra mandar a confirmação de volta). */
  phone: string;
  messageText: string;
  /** Id da mensagem citada na resposta (reply/quote do WhatsApp) — `null` se não for uma citação. */
  quotedMessageId: string | null;
}

/** Remove acentos via `\p{Diacritic}` (Unicode property escape) — mais seguro que digitar a faixa de marcas diacríticas à mão no código-fonte. */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/** Aceita variações comuns: "pago", "paguei", "pago!", "Pago.", etc. */
function isPaymentConfirmationText(text: string): boolean {
  return /^pag(o|uei)\b/.test(normalizeText(text));
}

/**
 * Confirma o pagamento a partir de uma resposta de texto "PAGO" no
 * WhatsApp — os endpoints de botão interativo da Z-API não entregam
 * de fato nesta instância (ver `zapi-client.ts`), então a confirmação
 * deixou de ser por clique e passou a ser por texto.
 *
 * Desambiguação: o número de WhatsApp é único pra clínica inteira
 * (nunca por conta — `OrganizationSettings.whatsapp`), então o
 * telefone sozinho não diz qual conta confirmar. Tenta, nesta ordem:
 * 1. Casar pelo id da mensagem citada (`quotedMessageId`) — a pessoa
 *    respondeu citando a mensagem do lembrete de uma conta específica.
 * 2. Se não veio citação (ou não achou nada), só confirma quando há
 *    EXATAMENTE 1 conta PENDENTE que já recebeu lembrete — nunca
 *    adivinha entre várias (integridade financeira não é negociável,
 *    ver CLAUDE.md). Com 0 ou 2+ candidatas, ignora e loga um aviso;
 *    a equipe confirma manualmente pelo app (que já funciona).
 *
 * Idempotente: se a conta encontrada já não está PENDENTE, não faz
 * nada (2ª resposta "PAGO" não tem efeito colateral).
 */
export async function handleZapiWebhookUseCase(
  input: HandleZapiWebhookInput,
  organizationId: string,
  deps: Deps,
): Promise<void> {
  if (!isPaymentConfirmationText(input.messageText)) {
    logger.info(
      "Webhook Z-API ignorado: texto não é confirmação de pagamento",
      {
        messageText: input.messageText,
      },
    );
    return;
  }

  let payable = input.quotedMessageId
    ? await deps.accountsPayableRepository.findByLastReminderMessageId(
        input.quotedMessageId,
      )
    : null;

  if (!payable) {
    const candidates = (
      await deps.accountsPayableRepository.listPendingForReminders(
        organizationId,
      )
    ).filter((candidate) => candidate.lastReminderSentAt !== null);

    if (candidates.length === 1) {
      payable = candidates[0];
    } else {
      logger.warn(
        "Webhook Z-API: não foi possível identificar a conta com confiança (ambíguo ou nenhuma candidata) — ignorado, confirme manualmente pelo app",
        {
          organizationId,
          candidateCount: candidates.length,
          quotedMessageId: input.quotedMessageId,
        },
      );
      return;
    }
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

  logger.info("Pagamento confirmado via webhook Z-API", {
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
