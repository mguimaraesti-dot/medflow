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
 * `/send-text` (`sendTextMessage`) passou a ser usada pro código de
 * barras do lembrete (teste comparativo de duas versões — ver
 * `BARCODE_MESSAGE_MODE` em `zapi-whatsapp-messaging.ts`): o botão OTP
 * (`sendButtonCodeMessage` abaixo) não entrega em grupo/iOS.
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
  const { instanceId, token, clientToken } = loadConfig();
  // Nunca logar `url` inteira — tem instanceId/token embutidos no path.
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}${path}`;

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
  /** Ver `SendButtonListInput.delayMessage`. */
  delayMessage?: number;
}

/** Mensagem de texto simples, sem interação — usada pro código de barras do lembrete (ver `zapi-whatsapp-messaging.ts`). */
export async function sendTextMessage(
  input: SendTextInput,
): Promise<{ messageId: string | null }> {
  const responseBody = (await post("/send-text", {
    phone: input.phone,
    message: input.message,
    delayMessage: input.delayMessage,
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
  /** Segundos (1-15) que a Z-API espera, na PRÓPRIA fila dela, antes de liberar a PRÓXIMA mensagem daquela conversa — não bloqueia esta requisição nem consome tempo de execução do nosso lado (testado em produção: ver `zapi-whatsapp-messaging.ts`). Omitido = default da Z-API (1-3s). */
  delayMessage?: number;
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
    delayMessage: input.delayMessage,
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
  /** Ver `SendButtonListInput.delayMessage`. */
  delayMessage?: number;
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
    delayMessage: input.delayMessage,
  });
}

export interface SendMessageReactionInput {
  phone: string;
  /** Id da mensagem a reagir (ex.: `lastReminderMessageId` do cartão-resumo do lembrete). */
  messageId: string;
  /** Emoji da reação (ex.: "👍"). */
  reaction: string;
}

/**
 * Reage com emoji a uma mensagem já enviada — usado pra sinalizar "pago"
 * na própria mensagem do lembrete, sem gerar mensagem nova no chat (ver
 * `handle-zapi-webhook.use-case.ts`).
 *
 * CORREÇÃO (2026-07-21): a página de doc tem o slug
 * `message/send-message-reaction`, mas o path REAL do endpoint — visto
 * no exemplo de cURL da própria página — é `/send-reaction` (sem
 * "message" no meio). Usar `/send-message-reaction` (como antes) faz a
 * Z-API responder 200 com `{"error":"NOT_FOUND","message":"Unable to
 * find matching target resource method"}` — confirmado em produção
 * (log real do webhook). Corpo `{ phone, messageId, reaction }` está
 * correto e não muda; `phone` aceita grupo, igual aos outros endpoints.
 */
export async function sendMessageReactionMessage(
  input: SendMessageReactionInput,
): Promise<void> {
  await post("/send-reaction", {
    phone: input.phone,
    messageId: input.messageId,
    reaction: input.reaction,
  });
}

export interface SendButtonPixInput {
  phone: string;
  pixKey: string;
  pixKeyType: "CPF" | "CNPJ" | "PHONE" | "EMAIL" | "EVP";
  merchantName: string;
  /** Ver `SendButtonListInput.delayMessage`. */
  delayMessage?: number;
}

/**
 * Mensagem com botão nativo de copiar a chave Pix.
 *
 * LIMITAÇÃO CONFIRMADA (developer.z-api.io/message/send-button-pix, pt e en):
 * o corpo aceita só `phone`, `pixKey`, `type` (CPF/CNPJ/PHONE/EMAIL/EVP) e
 * `merchantName` (título do botão). Não existe campo pra customizar o rótulo
 * do "tipo de chave" — o texto exibido pro WhatsApp (ex: "Chave aleatória"
 * quando `type: "EVP"`) é renderizado nativamente pelo card de Pix do
 * WhatsApp Business a partir do `type`, sem controle via API. Não há como
 * trocar esse texto para "Chave PIX" (ou qualquer outro) sem mudar o valor
 * de `type` em si — o que mudaria o rótulo errado (ex: para "Chave CPF").
 */
export async function sendButtonPixMessage(
  input: SendButtonPixInput,
): Promise<void> {
  await post("/send-button-pix", {
    phone: input.phone,
    pixKey: input.pixKey,
    type: input.pixKeyType,
    merchantName: input.merchantName,
    delayMessage: input.delayMessage,
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

export interface SendDocumentInput {
  phone: string;
  /** Data URI base64 (`data:application/pdf;base64,...`) — a Z-API também aceita URL pública, mas aqui o PDF é gerado on-the-fly (`jspdf`) e nunca fica hospedado em lugar nenhum. */
  document: string;
  fileName?: string;
  caption?: string;
}

/**
 * Envia um documento (anexo de arquivo, ex: PDF) — documentado em
 * `/send-document/{extension}` (confirmado via developer.z-api.io,
 * 2026-07-16: aceita `document` como URL pública OU base64, `fileName`
 * e `caption` opcionais). Usado pelo Relatório de Recebimentos (PDF de
 * múltiplas páginas, diferente dos outros relatórios que enviam
 * imagem via `sendImageMessage`).
 */
export async function sendDocumentMessage(
  input: SendDocumentInput,
): Promise<void> {
  await post("/send-document/pdf", {
    phone: input.phone,
    document: input.document,
    fileName: input.fileName,
    caption: input.caption,
  });
}
