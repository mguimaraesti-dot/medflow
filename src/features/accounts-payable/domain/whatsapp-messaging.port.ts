/**
 * Abstrai o envio das mensagens de cobrança via WhatsApp — hoje só a
 * Z-API (`infrastructure/zapi-whatsapp-messaging.ts`), mas os use cases
 * nunca importam o cliente Z-API diretamente, só esta porta. Troca de
 * provedor de WhatsApp no futuro vira só uma nova implementação desta
 * interface, sem tocar em domain/application.
 *
 * Mensagens de texto simples, não botões interativos — testamos os
 * endpoints de botão desta instância da Z-API e nenhum entrega de fato
 * no WhatsApp (200 de sucesso, mensagem nunca chega). A confirmação de
 * pagamento passou a ser por resposta de texto ("PAGO"), citando a
 * mensagem do lembrete — ver `handle-zapi-webhook.use-case.ts`.
 */
export interface WhatsAppPaymentReminderInput {
  /** Telefone da clínica (`OrganizationSettings.whatsapp`) que recebe o lembrete — dono do caixa, não o fornecedor. */
  phone: string;
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
   * Dispara as 3 mensagens do lembrete (cartão-resumo, código de
   * barras, chave Pix) — as duas últimas só quando o dado
   * correspondente existe. Devolve o id da 1ª mensagem (cartão-resumo)
   * — é a que a pessoa deve citar ao responder "PAGO", pra o webhook
   * saber exatamente qual conta confirmar (o telefone é único pra
   * clínica inteira, nunca desambigua sozinho).
   */
  sendPaymentReminder(
    input: WhatsAppPaymentReminderInput,
  ): Promise<{ messageId: string | null }>;

  /** Mensagem de agradecimento enviada depois que o webhook confirma o pagamento (resposta "PAGO"). */
  sendPaymentConfirmedMessage(phone: string): Promise<void>;

  /** Mensagem separadora entre um lembrete e outro, quando o cron dispara mais de uma conta pro mesmo telefone na mesma execução. */
  sendSeparatorMessage(phone: string): Promise<void>;
}
