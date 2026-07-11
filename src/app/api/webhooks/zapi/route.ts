import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import { handleApiError } from "@/core/errors/error-handler";
import { UnauthenticatedError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { handleZapiWebhookUseCase } from "@/features/accounts-payable/application/handle-zapi-webhook.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";
import { PrismaUserRepository } from "@/features/auth/infrastructure/prisma-user.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const safeRepository = new PrismaSafeRepository();
const userRepository = new PrismaUserRepository();

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
 * esse prefixo só existe nos ids que o próprio sistema gera. Se o
 * primeiro teste real mostrar que não bate, ajustar aqui usando os
 * logs (`body` completo já é logado abaixo).
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
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const secret = request.nextUrl.searchParams.get("secret");
    if (secret !== process.env.ZAPI_WEBHOOK_SECRET) {
      throw new UnauthenticatedError();
    }

    const body = await request.json();

    const buttonIdMatch = JSON.stringify(body).match(/pago_([\w-]+)/);
    const accountsPayableId = buttonIdMatch ? buttonIdMatch[1] : null;

    // Diagnóstico: a Z-API manda TIPOS diferentes de evento pro mesmo
    // endpoint (clique de botão, mensagem de texto, status de entrega
    // "DELIVERED"/lida "READ", presença, etc.) — campos como `type`,
    // `status`, `fromApi`, `fromMe`, `isStatusReply` costumam ser os
    // discriminadores. Logando esses candidatos + o resultado da busca
    // por "pago_" separado do body inteiro, pra ficar fácil de ler nos
    // logs da Vercel qual evento exatamente disparou o webhook.
    logger.info("Payload recebido do webhook Z-API", {
      body,
      type: (body as Record<string, unknown> | null)?.type,
      status: (body as Record<string, unknown> | null)?.status,
      fromApi: (body as Record<string, unknown> | null)?.fromApi,
      fromMe: (body as Record<string, unknown> | null)?.fromMe,
      isStatusReply: (body as Record<string, unknown> | null)?.isStatusReply,
      buttonIdFoundInPayload: accountsPayableId
        ? `pago_${accountsPayableId}`
        : null,
    });

    const fromApi = (body as Record<string, unknown> | null)?.fromApi;

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
