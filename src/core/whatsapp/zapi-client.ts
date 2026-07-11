import { logger } from "@/core/logger/logger";

/**
 * Cliente fino sobre a API HTTP da Z-API (WhatsApp) — mesmo padrão de
 * `core/google-drive/google-drive.client.ts` (funções simples,
 * `loadConfig()` lendo env em cada chamada, normalizador de erro).
 *
 * Nunca importar este módulo em código "use client": lê `ZAPI_TOKEN` e
 * `ZAPI_CLIENT_TOKEN` (segredos), só existe no servidor.
 *
 * HISTÓRICO: os endpoints de botão interativo (`/send-button-list`,
 * `/send-button-otp`, `/send-button-pix`) inicialmente pareciam não
 * entregar mensagem nenhuma nesta instância (200 com zaapId/messageId,
 * nada chegava no WhatsApp de teste). A causa raiz era a opção
 * "Mensagens de Botões" desativada nas Configurações Beta do painel da
 * Z-API — com ela ativada, os três tipos de botão foram testados e
 * confirmados entregando de verdade. Por isso o fluxo voltou a usar
 * botões nativos (cartão-resumo com botão "Pago", código de barras e
 * Pix com botão de copiar), com o id da conta embutido no botão
 * (`pago_<accountsPayableId>`) — a confirmação de pagamento volta a
 * ser por clique, não mais por resposta de texto "PAGO".
 *
 * `/send-text` (`sendTextMessage`) não tem uso atual no projeto — mantida
 * disponível caso surja necessidade de mensagem simples sem interação
 * (ex: agradecimento pós-pagamento).
 *
 * IMPORTANTE: a Z-API às vezes responde HTTP 200 mesmo quando a
 * mensagem não é entregue de verdade (instância desconectada, número
 * inválido, payload rejeitado) — o `!response.ok` sozinho não pega
 * isso. `post()` sempre loga status+corpo da resposta (`logger.error`,
 * que já grava via `console.error`) e trata um campo `error` truthy no
 * corpo como falha, mesmo com status 2xx.
 */
interface ZapiConfig {
  instanceId: string;
  token: string;
  clientToken: string;
}

function loadConfig(): ZapiConfig {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token || !clientToken) {
    throw new Error(
      "Z-API não configurada: defina ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN.",
    );
  }

  return { instanceId, token, clientToken };
}

function toZapiError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** Corpo de erro documentado pela Z-API em falhas de negócio (instância desconectada, número inválido etc.) — chega com status 2xx mesmo assim. */
interface ZapiErrorBody {
  error?: unknown;
  value?: unknown;
}

function parseJsonSafe(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** `error` truthy ou `value: false` no corpo indicam falha mesmo com HTTP 2xx — únicos campos documentados pela Z-API pra isso. */
function bodyIndicatesFailure(parsedBody: unknown): boolean {
  if (typeof parsedBody !== "object" || parsedBody === null) return false;
  const body = parsedBody as ZapiErrorBody;
  return Boolean(body.error) || body.value === false;
}

/** Devolve o corpo já parseado (ou `undefined` se não for JSON) — quem chama extrai o id da mensagem, se precisar. */
async function post(path: string, body: unknown): Promise<unknown> {
  // Nomes das chaves evitam a substring "token" de propósito — o logger
  // redige qualquer valor cuja chave contenha "token"/"secret"/etc
  // (core/logger/logger.ts), o que apagaria esses booleanos de
  // diagnóstico e não o segredo em si (aqui só existe true/false).
  logger.info("prestes a chamar Z-API (post)", {
    path,
    instanceIdConfigured: Boolean(process.env.ZAPI_INSTANCE_ID),
    apiCredentialConfigured: Boolean(process.env.ZAPI_TOKEN),
    clientCredentialConfigured: Boolean(process.env.ZAPI_CLIENT_TOKEN),
  });

  const { instanceId, token, clientToken } = loadConfig();
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}${path}`;

  // Nunca loga `url` inteira — tem instanceId/token embutidos no path.
  logger.info("chamando fetch da Z-API agora", { path });

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    logger.error("Z-API: falha de rede ao chamar endpoint", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    throw toZapiError(error);
  }

  const responseText = await response.text();
  const parsedBody = parseJsonSafe(responseText);

  if (!response.ok || bodyIndicatesFailure(parsedBody)) {
    logger.error("Z-API respondeu com falha", {
      path,
      status: response.status,
      body: responseText,
    });
    throw new Error(
      `Z-API respondeu ${response.status} em ${path}: ${responseText}`,
    );
  }

  logger.info("Z-API: mensagem aceita", {
    path,
    status: response.status,
    body: responseText,
  });

  return parsedBody;
}

/** Resposta documentada da Z-API pro `/send-text` — não validada de verdade ainda; `messageId` cai pra `undefined` se o nome do campo for outro (ajustar após o primeiro teste real). */
interface ZapiSendTextResponse {
  zaapId?: string;
  messageId?: string;
  id?: string;
}

export interface SendTextInput {
  phone: string;
  message: string;
}

/** Mensagem de texto simples, sem interação — usada só pro separador entre contas do mesmo lote e pelo agradecimento pós-pagamento (ver `zapi-whatsapp-messaging.ts`). */
export async function sendTextMessage(
  input: SendTextInput,
): Promise<{ messageId: string | null }> {
  const responseBody = (await post("/send-text", {
    phone: input.phone,
    message: input.message,
  })) as ZapiSendTextResponse | undefined;

  const messageId =
    responseBody?.messageId ?? responseBody?.zaapId ?? responseBody?.id;

  return { messageId: messageId ?? null };
}

export interface SendButtonListInput {
  phone: string;
  message: string;
  /** Id do botão — carrega o `accountsPayableId` (prefixado `pago_`), pro webhook identificar exatamente qual conta confirmar sem precisar casar telefone nem mensagem citada. */
  buttonId: string;
  buttonLabel: string;
}

/** Cartão-resumo do lembrete com um único botão de ação (ex: "Pago"). */
export async function sendButtonListMessage(
  input: SendButtonListInput,
): Promise<{ messageId: string | null }> {
  const responseBody = (await post("/send-button-list", {
    phone: input.phone,
    message: input.message,
    buttonList: {
      buttons: [{ id: input.buttonId, label: input.buttonLabel }],
    },
  })) as ZapiSendTextResponse | undefined;

  const messageId =
    responseBody?.messageId ?? responseBody?.zaapId ?? responseBody?.id;

  return { messageId: messageId ?? null };
}

export interface SendButtonCodeInput {
  phone: string;
  message: string;
  code: string;
  buttonText: string;
}

/** Mensagem com botão nativo de copiar um código (usado pro código de barras do boleto). */
export async function sendButtonCodeMessage(
  input: SendButtonCodeInput,
): Promise<void> {
  await post("/send-button-otp", {
    phone: input.phone,
    message: input.message,
    code: input.code,
    buttonText: input.buttonText,
  });
}

export interface SendButtonPixInput {
  phone: string;
  pixKey: string;
  pixKeyType: "CPF" | "CNPJ" | "PHONE" | "EMAIL" | "EVP";
  merchantName: string;
}

/** Mensagem com botão nativo de copiar a chave Pix. */
export async function sendButtonPixMessage(
  input: SendButtonPixInput,
): Promise<void> {
  await post("/send-button-pix", {
    phone: input.phone,
    pixKey: input.pixKey,
    type: input.pixKeyType,
    merchantName: input.merchantName,
  });
}

export interface SendImageInput {
  phone: string;
  /** Data URI base64 (`data:image/png;base64,...`) — a Z-API também aceita URL pública, mas aqui a imagem é gerada on-the-fly (`next/og`) e nunca fica hospedada em lugar nenhum. */
  image: string;
  caption?: string;
}

/** Envia uma imagem (documentado em `/send-image`: `image` aceita URL pública OU base64). Usado pelo botão "Enviar por WhatsApp" dos relatórios (imagem-resumo, não anexo de arquivo). */
export async function sendImageMessage(input: SendImageInput): Promise<void> {
  await post("/send-image", {
    phone: input.phone,
    image: input.image,
    caption: input.caption,
  });
}
