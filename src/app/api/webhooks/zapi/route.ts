import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import { handleApiError } from "@/core/errors/error-handler";
import { UnauthenticatedError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import {
  handleZapiWebhookUseCase,
  handleZapiReactionWebhookUseCase,
} from "@/features/accounts-payable/application/handle-zapi-webhook.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { ZapiWhatsAppMessaging } from "@/features/accounts-payable/infrastructure/zapi-whatsapp-messaging";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaUserRepository } from "@/features/auth/infrastructure/prisma-user.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const safeRepository = new PrismaSafeRepository();
const userRepository = new PrismaUserRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();
const whatsAppMessaging = new ZapiWhatsAppMessaging();

// 👍 = U+1F44D. Tom de pele (👍🏻👍🏼👍🏽👍🏾👍🏿) é um SEGUNDO codepoint
// modificador (U+1F3FB-U+1F3FF) grudado depois, não substitui o
// primeiro — por isso comparar só o primeiro codepoint casa 👍 com
// qualquer tom (ou nenhum), sem afrouxar pra outros emojis (👎, ❤️,
// etc. começam com codepoints totalmente diferentes). Confirmado em
// produção: o iPhone aplica o tom de pele padrão do teclado
// automaticamente na reação rápida do WhatsApp — testado com
// `reaction.value === "👍🏻"`, que a comparação exata antiga rejeitava.
const THUMBS_UP_CODEPOINT = 0x1f44d;

function isThumbsUpEmoji(value: unknown): boolean {
  return (
    typeof value === "string" && value.codePointAt(0) === THUMBS_UP_CODEPOINT
  );
}

/**
 * Recebe o clique no botão "Pago" enviado pela Z-API — sem sessão,
 * autenticada por um `?secret=` na query string (cadastrado também no
 * painel da Z-API) em vez de `requirePermission`. O painel da Z-API
 * não tem campo de header customizado pra webhook, só permite anexar
 * a URL — por isso o segredo vai na query string, não num header.
 *
 * O id do botão clicado (`pago_<accountsPayableId>`) identifica a
 * conta exatamente, sem precisar casar telefone (único por
 * organização) nem mensagem citada — ver `zapi-whatsapp-messaging.ts`.
 * Como ainda não confirmamos contra a API de verdade o campo exato em
 * que a Z-API embute o id do botão clicado no payload do callback
 * (só tínhamos confirmado o formato da resposta de texto, antes de
 * reverter pra botões — ver histórico em `zapi-client.ts`), a extração
 * abaixo procura o token "pago_<id>" em qualquer lugar do payload
 * bruto, em vez de um campo fixo — tolerante ao formato exato, já que
 * esse prefixo só existe nos ids que o próprio sistema gera.
 *
 * BUG corrigido: a mensagem que o próprio sistema envia (o
 * cartão-resumo do lembrete, com o botão "Pago" embutido) também
 * dispara este webhook de volta — provavelmente um evento de
 * status/eco da própria mensagem enviada via API, que ecoa de volta o
 * `buttonList` original (incluindo o `pago_<id>`). Sem checar isso,
 * QUALQUER evento relacionado à mensagem do sistema (não só o clique
 * de verdade) confirmava o pagamento sozinho. `fromApi: true` já foi
 * confirmado nesta mesma integração (ver histórico) como o sinal
 * confiável de "evento originado pelo próprio sistema" — reaproveitado
 * aqui pra ignorar esses ecos e só processar cliques humanos de verdade.
 *
 * GATILHO ADICIONAL: reação 👍 na mensagem do lembrete também dá
 * baixa (além do clique no botão, que continua funcionando em
 * paralelo). Reações chegam neste MESMO webhook (confirmado na doc da
 * Z-API, `webhooks/on-message-received-examples`: mesmo `type:
 * "ReceivedCallback"`, com um campo `reaction` a mais no payload) — não
 * existe endpoint/URL separado, nem configuração extra conhecida no
 * painel. Salvaguardas EM CASCATA antes de considerar a reação válida
 * (todas obrigatórias, na ordem):
 *   1. `body.reaction` existe (é mesmo um evento de reação);
 *   2. `fromMe !== true` — ignora reação da PRÓPRIA instância (evita
 *      confundir com a reação ✅ de confirmação que o sistema manda
 *      após a baixa — ver `zapi-whatsapp-messaging.ts`). Não
 *      confirmado a fundo ainda se `fromMe` distingue de forma
 *      confiável reações enviadas por nós; por isso a confirmação usa
 *      um emoji DIFERENTE (✅, não 👍) como segunda camada de proteção
 *      independente deste campo;
 *   3. `isThumbsUpEmoji(reaction.value)` — 👍 em qualquer tom de pele
 *      (ou nenhum) confirma; qualquer outro emoji é ignorado (ver
 *      comentário da função, definida logo acima, pelo porquê da
 *      comparação não ser uma igualdade de string simples);
 * As 2 últimas (achar a conta pelo `referencedMessage.messageId` e
 * checar se ainda está PENDENTE) rodam dentro de
 * `handleZapiReactionWebhookUseCase`, que reaproveita o mesmo núcleo de
 * baixa do clique no botão.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const secret = request.nextUrl.searchParams.get("secret");
    if (secret !== process.env.ZAPI_WEBHOOK_SECRET) {
      throw new UnauthenticatedError();
    }

    const body = await request.json();
    const bodyRecord = body as Record<string, unknown> | null;

    // Salvaguarda 1 (cascata): é mesmo um evento de reação? Formato
    // confirmado na doc: `reaction: { value, referencedMessage: { messageId } }`.
    const reaction = bodyRecord?.reaction as
      | { value?: unknown; referencedMessage?: { messageId?: unknown } }
      | undefined;

    if (reaction && typeof reaction === "object") {
      // Salvaguarda 2: ignora reação da PRÓPRIA instância (evita loop
      // com a reação ✅ de confirmação — ver doc do arquivo acima).
      if (bodyRecord?.fromMe === true) {
        logger.info(
          "Webhook Z-API (reação): ignorada — fromMe true (reação da própria instância, provavelmente a confirmação ✅)",
        );
        return NextResponse.json({ data: { received: true, ignored: true } });
      }

      // Salvaguarda 3: só 👍 (qualquer tom de pele) dá baixa.
      if (!isThumbsUpEmoji(reaction.value)) {
        logger.info("Webhook Z-API (reação): ignorada — emoji não é 👍", {
          emoji: reaction.value,
        });
        return NextResponse.json({ data: { received: true, ignored: true } });
      }

      const referencedMessageId = reaction.referencedMessage?.messageId;
      if (typeof referencedMessageId !== "string" || !referencedMessageId) {
        logger.warn(
          "Webhook Z-API (reação 👍): payload sem referencedMessage.messageId — ignorado",
        );
        return NextResponse.json({ data: { received: true, ignored: true } });
      }

      const organization = await prisma.organization.findFirst();
      if (!organization) {
        logger.warn("Webhook Z-API ignorado: nenhuma organização cadastrada");
        return NextResponse.json({ data: { received: true, ignored: true } });
      }

      await handleZapiReactionWebhookUseCase(
        { referencedMessageId },
        organization.id,
        {
          accountsPayableRepository,
          safeRepository,
          userRepository,
          organizationSettingsRepository,
          whatsAppMessaging,
        },
      );

      return NextResponse.json({ data: { received: true } });
    }

    const buttonIdMatch = JSON.stringify(body).match(/pago_([\w-]+)/);
    const accountsPayableId = buttonIdMatch ? buttonIdMatch[1] : null;

    const fromApi = bodyRecord?.fromApi;

    if (!accountsPayableId || fromApi) {
      // Não é um clique no botão "Pago" (status de entrega, presença,
      // outro tipo de evento), ou é um eco de evento originado pelo
      // próprio sistema (fromApi: true) — ignora.
      return NextResponse.json({ data: { received: true, ignored: true } });
    }

    // MVP mono-organização (CLAUDE.md) — o webhook não tem sessão, então
    // resolve a única organização existente (mesmo padrão do cron).
    const organization = await prisma.organization.findFirst();
    if (!organization) {
      logger.warn("Webhook Z-API ignorado: nenhuma organização cadastrada");
      return NextResponse.json({ data: { received: true, ignored: true } });
    }

    await handleZapiWebhookUseCase({ accountsPayableId }, organization.id, {
      accountsPayableRepository,
      safeRepository,
      userRepository,
      organizationSettingsRepository,
      whatsAppMessaging,
    });

    return NextResponse.json({ data: { received: true } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/webhooks/zapi",
      useCase: "handleZapiWebhookUseCase",
    });
  }
}
