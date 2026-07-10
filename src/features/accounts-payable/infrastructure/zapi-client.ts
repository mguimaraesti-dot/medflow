/**
 * Cliente fino sobre a API HTTP da Z-API (WhatsApp) — mesmo padrão de
 * `core/google-drive/google-drive.client.ts` (funções simples,
 * `loadConfig()` lendo env em cada chamada, normalizador de erro).
 *
 * Nunca importar este módulo em código "use client": lê `ZAPI_TOKEN` e
 * `ZAPI_CLIENT_TOKEN` (segredos), só existe no servidor.
 *
 * O formato exato dos endpoints (`/send-button-list`, `/send-button-actions`)
 * segue a documentação pública da Z-API — não foi validado contra a API
 * de verdade dentro deste projeto ainda. Ver aviso equivalente no
 * webhook (`app/api/webhooks/zapi/route.ts`) sobre o payload de entrada.
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

async function post(path: string, body: unknown): Promise<void> {
  const { instanceId, token, clientToken } = loadConfig();
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}${path}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(
        `Z-API respondeu ${response.status} em ${path}: ${responseBody}`,
      );
    }
  } catch (error) {
    throw toZapiError(error);
  }
}

export interface SendButtonListInput {
  phone: string;
  message: string;
  /** Id do botão "Pago" — o webhook devolve esse mesmo valor no clique. */
  buttonId: string;
  buttonLabel: string;
}

/** Mensagem 1 do lembrete: cartão-resumo com botão "Pago". */
export async function sendButtonListMessage(
  input: SendButtonListInput,
): Promise<void> {
  await post("/send-button-list", {
    phone: input.phone,
    message: input.message,
    buttonList: {
      buttons: [{ id: input.buttonId, label: input.buttonLabel }],
    },
  });
}

export interface SendCopyButtonInput {
  phone: string;
  message: string;
  copyCode: string;
  buttonLabel: string;
}

/** Mensagens 2 e 3 do lembrete: código de barras / chave Pix com botão de copiar. */
export async function sendCopyButtonMessage(
  input: SendCopyButtonInput,
): Promise<void> {
  await post("/send-button-actions", {
    phone: input.phone,
    message: input.message,
    buttonActions: [
      {
        id: "copy",
        type: "COPY",
        copyCode: input.copyCode,
        label: input.buttonLabel,
      },
    ],
  });
}
