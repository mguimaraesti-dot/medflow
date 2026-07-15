import {
  sendButtonListMessage,
  sendButtonCodeMessage,
  sendButtonPixMessage,
} from "@/core/whatsapp/zapi-client";
import type {
  WhatsAppMessagingPort,
  WhatsAppPaymentReminderInput,
} from "../domain/whatsapp-messaging.port";

/**
 * Segundos de espaçamento entre as mensagens de uma mesma conta —
 * repassado como `delayMessage` pra Z-API processar na PRÓPRIA fila
 * dela, sem bloquear a execução do nosso lado (ao contrário de um sleep
 * de código, que consumiria o `maxDuration` das rotas que chamam este
 * adapter). Testado em produção: ordem e espaçamento respeitados por
 * conversa mesmo disparando as mensagens em sequência imediata. Range
 * válido da Z-API é 1-15s.
 */
const REMINDER_MESSAGE_DELAY_SECONDS = 5;

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
      delayMessage: REMINDER_MESSAGE_DELAY_SECONDS,
    });

    if (input.barcode) {
      await sendButtonCodeMessage({
        phone: input.phone,
        message: `*${input.supplierName}*\nCódigo de barras da fatura:`,
        code: input.barcode,
        buttonText: "Copiar código de barras",
        delayMessage: REMINDER_MESSAGE_DELAY_SECONDS,
      });
    }

    if (input.pixKey) {
      await sendButtonPixMessage({
        phone: input.phone,
        pixKey: input.pixKey,
        pixKeyType: "EVP",
        merchantName: input.supplierName,
        delayMessage: REMINDER_MESSAGE_DELAY_SECONDS,
      });
    }

    return { messageId };
  }
}
