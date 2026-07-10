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
import { ZapiWhatsAppMessaging } from "@/features/accounts-payable/infrastructure/zapi-whatsapp-messaging";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const safeRepository = new PrismaSafeRepository();
const userRepository = new PrismaUserRepository();
const whatsAppMessaging = new ZapiWhatsAppMessaging();

/**
 * Recebe a resposta de texto "PAGO" enviada pela Z-API — sem sessão,
 * autenticada por um `?secret=` na query string (cadastrado também no
 * painel da Z-API) em vez de `requirePermission`. O painel da Z-API
 * não tem campo de header customizado pra webhook, só permite anexar
 * a URL — por isso o segredo vai na query string, não num header.
 *
 * Confirmação por texto, não por clique de botão — testamos os
 * endpoints de botão interativo desta instância e nenhum entrega de
 * fato no WhatsApp (ver `zapi-client.ts`).
 *
 * O formato exato do payload de mensagem recebida da Z-API não foi
 * validado contra a API de verdade ainda — o `logger.info` abaixo loga
 * o payload bruto de propósito, pra ajustar os campos abaixo
 * (`messageText`, `quotedMessageId`) depois do primeiro teste real.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const secret = request.nextUrl.searchParams.get("secret");
    if (secret !== process.env.ZAPI_WEBHOOK_SECRET) {
      throw new UnauthenticatedError();
    }

    const body = await request.json();
    logger.info("Payload recebido do webhook Z-API", { body });

    // Mensagens enviadas pelo próprio sistema (fromMe) ou eventos que não
    // são texto (status de entrega, presença etc.) são ignorados.
    const messageText: unknown = body?.text?.message ?? body?.message?.text;
    const phone: unknown = body?.phone;

    if (
      typeof messageText !== "string" ||
      !messageText ||
      typeof phone !== "string" ||
      !phone ||
      body?.fromMe
    ) {
      return NextResponse.json({ data: { received: true, ignored: true } });
    }

    // Id da mensagem citada (reply/quote) — nome do campo ainda não
    // confirmado contra a API de verdade, tentando os caminhos mais
    // plováveis da documentação da Z-API.
    const quotedMessageIdRaw: unknown =
      body?.referenceMessageId ??
      body?.quotedMsgId ??
      body?.message?.quotedMsg?.id ??
      body?.text?.quotedMsg?.id;
    const quotedMessageId =
      typeof quotedMessageIdRaw === "string" && quotedMessageIdRaw
        ? quotedMessageIdRaw
        : null;

    // MVP mono-organização (CLAUDE.md) — o webhook não tem sessão, então
    // resolve a única organização existente (mesmo padrão do cron).
    const organization = await prisma.organization.findFirst();
    if (!organization) {
      logger.warn("Webhook Z-API ignorado: nenhuma organização cadastrada");
      return NextResponse.json({ data: { received: true, ignored: true } });
    }

    await handleZapiWebhookUseCase(
      { phone, messageText, quotedMessageId },
      organization.id,
      {
        accountsPayableRepository,
        safeRepository,
        userRepository,
        whatsAppMessaging,
      },
    );

    return NextResponse.json({ data: { received: true } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/webhooks/zapi",
      useCase: "handleZapiWebhookUseCase",
    });
  }
}
