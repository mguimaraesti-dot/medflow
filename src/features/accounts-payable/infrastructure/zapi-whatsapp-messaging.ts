import { sendTextMessage } from "./zapi-client";
import type {
  WhatsAppMessagingPort,
  WhatsAppPaymentReminderInput,
} from "../domain/whatsapp-messaging.port";

/** Pequeno intervalo entre as mensagens (evita parecer spam) — curto de propósito: 3 mensagens sequenciais já competem com o limite de tempo da função serverless (ver `maxDuration` nas rotas que chamam este adapter). */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Implementa `WhatsAppMessagingPort` sobre a Z-API usando `/send-text`
 * (mensagem de texto simples) — os endpoints de botão interativo desta
 * instância não entregam de fato (ver aviso em `zapi-client.ts`). As
 * mensagens de boleto/Pix só são enviadas quando a conta tem o dado
 * correspondente cadastrado — nem toda conta a pagar tem boleto ou
 * chave Pix.
 *
 * Código de barras e chave Pix vão em duas mensagens cada (rótulo,
 * depois o valor sozinho em formatação monoespaçada) — assim, ao tocar
 * e segurar só na mensagem do valor, a opção "Copiar" do WhatsApp
 * copia exatamente o código/chave, sem texto extra junto.
 */
export class ZapiWhatsAppMessaging implements WhatsAppMessagingPort {
  async sendPaymentReminder(
    input: WhatsAppPaymentReminderInput,
  ): Promise<{ messageId: string | null }> {
    const { messageId } = await sendTextMessage({
      phone: input.phone,
      message:
        `🧾 *Conta a Pagar*\n\n` +
        `Fornecedor: ${input.supplierName}\n` +
        `Descrição: ${input.description}\n` +
        `Valor: ${input.amount}\n` +
        `Vencimento: ${input.dueDate}\n\n` +
        `✅ Assim que pagar, responda *esta mensagem* (cite-a) com *PAGO* para darmos baixa automaticamente.`,
    });

    if (input.digitableLine) {
      await delay(1200);
      await sendTextMessage({
        phone: input.phone,
        message: "📄 Código de barras (toque e segure para copiar):",
      });
      await delay(1200);
      await sendTextMessage({
        phone: input.phone,
        message: `\`\`\`${input.digitableLine}\`\`\``,
      });
    }

    if (input.pixKey) {
      await delay(1200);
      await sendTextMessage({
        phone: input.phone,
        message: "💠 Chave Pix (toque e segure para copiar):",
      });
      await delay(1200);
      await sendTextMessage({
        phone: input.phone,
        message: `\`\`\`${input.pixKey}\`\`\``,
      });
    }

    return { messageId };
  }

  async sendPaymentConfirmedMessage(phone: string): Promise<void> {
    await sendTextMessage({
      phone,
      message: "✅ Pagamento confirmado! Obrigado.",
    });
  }

  async sendSeparatorMessage(phone: string): Promise<void> {
    await sendTextMessage({
      phone,
      message: "*".repeat(30),
    });
  }
}
