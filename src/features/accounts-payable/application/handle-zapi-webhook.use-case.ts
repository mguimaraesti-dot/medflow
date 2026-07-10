import { logger } from "@/core/logger/logger";
import { NotFoundError } from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { UserRepository } from "@/features/auth/domain/user.repository";
import { WHATSAPP_SYSTEM_USER_EMAIL } from "../domain/whatsapp-system-user";
import { payAccountsPayableUseCase } from "./pay-accounts-payable.use-case";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  safeRepository: SafeRepository;
  userRepository: UserRepository;
}

/**
 * Confirma o pagamento a partir do clique no botão "Pago" no WhatsApp
 * (webhook da Z-API, sem sessão). Idempotente: se a conta já não está
 * PENDENTE (2º clique, ou já paga por outro caminho), não faz nada —
 * nunca lança erro nesse caso, só retorna. `paidByUserId` é sempre o
 * usuário de sistema (nunca a pessoa que clicou — o webhook não tem
 * como saber quem é).
 */
export async function handleZapiWebhookUseCase(
  publicToken: string,
  deps: Deps,
): Promise<void> {
  const payable =
    await deps.accountsPayableRepository.findByPublicToken(publicToken);
  if (!payable) {
    throw new NotFoundError("Conta a pagar", publicToken);
  }

  if (payable.status !== "PENDING") {
    logger.info("Webhook Z-API ignorado: conta não está mais pendente", {
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
}
