import { NextRequest, NextResponse } from "next/server";
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
 * autenticada por um header secreto (`x-webhook-secret`, cadastrado
 * também no painel da Z-API) em vez de `requirePermission`. Primeira
 * rota do projeto autenticada por segredo em vez de sessão de usuário.
 *
 * O formato exato do payload de clique em botão da Z-API não foi
 * validado contra a API de verdade ainda — o `logger.info` abaixo loga
 * o payload bruto de propósito, pra ajustar a extração do
 * `publicToken` depois do primeiro teste real (ver também
 * `zapi-client.ts`).
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const secretHeader = request.headers.get("x-webhook-secret");
    if (secretHeader !== process.env.ZAPI_WEBHOOK_SECRET) {
      throw new UnauthenticatedError();
    }

    const body = await request.json();
    logger.info("Payload recebido do webhook Z-API", { body });

    const publicToken: unknown =
      body?.buttonsResponseMessage?.buttonId ??
      body?.message?.buttonsResponseMessage?.buttonId ??
      body?.buttonId;

    if (typeof publicToken !== "string" || !publicToken) {
      logger.warn(
        "Webhook Z-API: não foi possível extrair o publicToken do payload",
        { body },
      );
      return NextResponse.json({ data: { received: true } });
    }

    await handleZapiWebhookUseCase(publicToken, {
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
