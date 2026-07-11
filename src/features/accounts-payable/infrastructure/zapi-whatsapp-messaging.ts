import {
  sendTextMessage,
  sendButtonListMessage,
  sendButtonCodeMessage,
  sendButtonPixMessage,
} from "./zapi-client";
import type {
  WhatsAppMessagingPort,
  WhatsAppPaymentReminderInput,
} from "../domain/whatsapp-messaging.port";

/** Intervalo entre as mensagens (evita parecer spam e dá tempo da Z-API processar cada botão) — ver `maxDuration` nas rotas que chamam este adapter. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Id do botão "Pago" — carrega o `accountsPayableId`, lido direto pelo webhook (ver `handle-zapi-webhook.use-case.ts`). */
function payButtonId(accountsPayableId: string): string {
  return `pago_${accountsPayableId}`;
}

/**
 * Implementa `WhatsAppMessagingPort` sobre a Z-API usando botões nativos
 * (ver histórico em `zapi-client.ts`). As mensagens de boleto/Pix só são
 * enviadas quando a conta tem o dado correspondente cadastrado — nem
 * toda conta a pagar tem boleto ou chave Pix.
 *
 * O tipo de chave Pix (`CPF`/`CNPJ`/`PHONE`/`EMAIL`/`EVP`) não existe
 * hoje no cadastro do MedFlow (`AccountsPayable.pixKey` é só a chave,
 * sem o tipo) — usa sempre `"EVP"` (chave aleatória) como padrão, igual
 * ao protótipo. Se a clínica cadastrar chaves de outros tipos (CPF,
 * e-mail, telefone), vale testar se o botão de copiar da Z-API ainda
 * funciona corretamente com o tipo errado, ou se isso precisa virar um
 * campo novo no cadastro.
 */
export class ZapiWhatsAppMessaging implements WhatsAppMessagingPort {
  async sendPaymentReminder(
    input: WhatsAppPaymentReminderInput,
  ): Promise<{ messageId: string | null }> {
    const { messageId } = await sendButtonListMessage({
      phone: input.phone,
      message:
        `⚠️ *Conta a Pagar*\n\n` +
        `Fornecedor: *${input.supplierName}*\n` +
        `Descrição: *${input.description}*\n` +
        `Valor: *${input.amount}*\n` +
        `Vencimento: *${input.dueDate}*`,
      buttonId: payButtonId(input.accountsPayableId),
      buttonLabel: "Pago",
    });

    if (input.barcode) {
      await delay(3000);
      await sendButtonCodeMessage({
        phone: input.phone,
        message: "Código de barras da fatura:",
        code: input.barcode,
        buttonText: "Copiar código de barras",
      });
    }

    if (input.pixKey) {
      await delay(3000);
      await sendButtonPixMessage({
        phone: input.phone,
        pixKey: input.pixKey,
        pixKeyType: "EVP",
        merchantName: input.supplierName,
      });
    }

    return { messageId };
  }

  async sendSeparatorMessage(phone: string): Promise<void> {
    await sendTextMessage({
      phone,
      message: "*".repeat(30),
    });
  }
}
