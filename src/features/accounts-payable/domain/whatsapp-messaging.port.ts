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

export interface WhatsAppPaymentConfirmedReactionInput {
  /** Mesmo destino que recebeu o lembrete (`OrganizationSettings.accountsPayableReminderWhatsapp || whatsapp`) — reage na mesma conversa/grupo. */
  phone: string;
  /** `AccountsPayable.lastReminderMessageId` — id da mensagem do cartão-resumo a reagir. */
  messageId: string;
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

  /**
   * Reage com ✅ na mensagem original do lembrete, para sinalizar "pago"
   * sem gerar mensagem nova no chat (ver `handle-zapi-webhook.use-case.ts`
   * — a mensagem de resposta que o próprio clique no botão já gera é do
   * protocolo do WhatsApp, fora do nosso controle; isso aqui é só o
   * feedback extra da baixa em si). Emoji ✅ (não 👍) DE PROPÓSITO — o
   * gatilho de baixa por reação só dispara em 👍, então a confirmação
   * do sistema nunca é confundida com um novo gatilho (anti-loop).
   */
  reactToPaymentConfirmed(
    input: WhatsAppPaymentConfirmedReactionInput,
  ): Promise<void>;
}
