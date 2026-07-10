/**
 * Abstrai o envio das mensagens de cobrança via WhatsApp — hoje só a
 * Z-API (`infrastructure/zapi-whatsapp-messaging.ts`), mas os use cases
 * nunca importam o cliente Z-API diretamente, só esta porta. Troca de
 * provedor de WhatsApp no futuro vira só uma nova implementação desta
 * interface, sem tocar em domain/application.
 */
export interface WhatsAppPaymentReminderInput {
  /** Telefone da clínica (`OrganizationSettings.whatsapp`) que recebe o lembrete — dono do caixa, não o fornecedor. */
  phone: string;
  /** Usado como id do botão "Pago" — o webhook usa esse valor pra achar a conta, nunca o id interno do banco. */
  publicToken: string;
  supplierName: string;
  description: string;
  /** Já formatado (ex: "R$ 1.234,56"). */
  amount: string;
  /** Já formatado (dd/MM/yyyy). */
  dueDate: string;
  /** `null` = conta sem boleto cadastrado — a 2ª mensagem (código de barras) é pulada. */
  digitableLine: string | null;
  /** `null` = conta sem chave Pix cadastrada — a 3ª mensagem (Pix) é pulada. */
  pixKey: string | null;
}

export interface WhatsAppMessagingPort {
  /**
   * Dispara as 3 mensagens do lembrete (cartão-resumo com botão "Pago",
   * código de barras com botão de copiar, chave Pix com botão de
   * copiar) — as duas últimas só quando o dado correspondente existe.
   */
  sendPaymentReminder(input: WhatsAppPaymentReminderInput): Promise<void>;
}
