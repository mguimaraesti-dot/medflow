import { sendButtonListMessage, sendCopyButtonMessage } from "./zapi-client";
import type {
  WhatsAppMessagingPort,
  WhatsAppPaymentReminderInput,
} from "../domain/whatsapp-messaging.port";

/**
 * Implementa `WhatsAppMessagingPort` sobre a Z-API. As mensagens de
 * boleto/Pix só são enviadas quando a conta tem o dado correspondente
 * cadastrado — nem toda conta a pagar tem boleto ou chave Pix.
 */
export class ZapiWhatsAppMessaging implements WhatsAppMessagingPort {
  async sendPaymentReminder(
    input: WhatsAppPaymentReminderInput,
  ): Promise<void> {
    await sendButtonListMessage({
      phone: input.phone,
      message:
        `📋 *Lembrete de pagamento*\n\n` +
        `Fornecedor: ${input.supplierName}\n` +
        `Descrição: ${input.description}\n` +
        `Valor: ${input.amount}\n` +
        `Vencimento: ${input.dueDate}`,
      buttonId: input.publicToken,
      buttonLabel: "Pago",
    });

    if (input.digitableLine) {
      await sendCopyButtonMessage({
        phone: input.phone,
        message: "📄 Código de barras do boleto:",
        copyCode: input.digitableLine,
        buttonLabel: "Copiar código",
      });
    }

    if (input.pixKey) {
      await sendCopyButtonMessage({
        phone: input.phone,
        message: "💠 Chave Pix para pagamento:",
        copyCode: input.pixKey,
        buttonLabel: "Copiar chave Pix",
      });
    }
  }
}
