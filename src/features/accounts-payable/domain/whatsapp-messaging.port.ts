/**
 * Abstrai o envio das mensagens de cobrança via WhatsApp — hoje só a
 * Z-API (`infrastructure/zapi-whatsapp-messaging.ts`), mas os use cases
 * nunca importam o cliente Z-API diretamente, só esta porta. Troca de
 * provedor de WhatsApp no futuro vira só uma nova implementação desta
 * interface, sem tocar em domain/application.
 *
 * Botões interativos nativos (cartão-resumo com botão "Pago", código
 * de barras/Pix com botão de copiar) — ver histórico em
 * `zapi-client.ts`. A confirmação de pagamento é por clique no botão
 * "Pago", que carrega o id da conta — ver `handle-zapi-webhook.use-case.ts`.
 * A baixa acontece silenciosamente no sistema — decisão de produto:
 * nenhuma mensagem de confirmação é enviada de volta ao WhatsApp.
 */
export interface WhatsAppPaymentReminderInput {
  /** Usado como id do botão "Pago" (`pago_<accountsPayableId>`) — o webhook lê esse id direto do payload do clique, sem precisar casar telefone nem mensagem. */
  accountsPayableId: string;
  /** Telefone da clínica (`OrganizationSettings.whatsapp`) que recebe o lembrete — dono do caixa, não o fornecedor. */
  phone: string;
  supplierName: string;
  description: string;
  /** Já formatado (ex: "R$ 1.234,56"). */
  amount: string;
  /** Já formatado (dd/MM/yyyy). */
  dueDate: string;
  /** `null` = conta sem código de barras cadastrado — a 2ª mensagem (código de barras) é pulada. Vem de `AccountsPayable.barcode` — não `digitableLine` (esse fica sempre vazio, nenhum formulário escreve nele hoje). */
  barcode: string | null;
  /** `null` = conta sem chave Pix cadastrada — a 3ª mensagem (Pix) é pulada. */
  pixKey: string | null;
}

export interface WhatsAppMessagingPort {
  /**
   * Dispara o lembrete (cartão-resumo com botão "Pago", código de
   * barras e/ou chave Pix com botão de copiar — os 2 últimos só quando
   * o dado correspondente existe). Devolve o id da mensagem do
   * cartão-resumo — só auditoria/depuração, a confirmação em si casa
   * pelo id da conta embutido no próprio botão clicado.
   */
  sendPaymentReminder(
    input: WhatsAppPaymentReminderInput,
  ): Promise<{ messageId: string | null }>;
}
