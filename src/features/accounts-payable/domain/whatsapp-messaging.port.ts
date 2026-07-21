/**
 * Abstrai o envio das mensagens de cobrança via WhatsApp — hoje só a
 * Z-API (`infrastructure/zapi-whatsapp-messaging.ts`), mas os use cases
 * nunca importam o cliente Z-API diretamente, só esta porta. Troca de
 * provedor de WhatsApp no futuro vira só uma nova implementação desta
 * interface, sem tocar em domain/application.
 *
 * Cartão principal e código de barras são texto simples; a chave Pix
 * ainda usa botão nativo de copiar (ver histórico em `zapi-client.ts`).
 * A confirmação de pagamento é por REAÇÃO 👍 na mensagem do lembrete
 * (ver `handleZapiReactionWebhookUseCase` em
 * `handle-zapi-webhook.use-case.ts`) — mensagens antigas com botão
 * "Pago" ainda dão baixa se clicadas (o handler de clique não foi
 * removido, só o envio de botão parou). A baixa acontece
 * silenciosamente no sistema — decisão de produto: nenhuma mensagem de
 * confirmação é enviada de volta ao WhatsApp.
 */
export interface WhatsAppPaymentReminderInput {
  /** Usado só nos logs de acompanhamento do envio (sucesso/falha por conta) — não gera mais nenhum botão; a baixa é achada casando `lastReminderMessageId` (capturado da resposta do envio) com a reação recebida. */
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
   * Dispara o lembrete (cartão-resumo em texto simples, código de
   * barras e/ou chave Pix com botão de copiar — os 2 últimos só quando
   * o dado correspondente existe). Devolve o id da mensagem do
   * cartão-resumo — persistido em `AccountsPayable.lastReminderMessageId`,
   * é o que casa a reação 👍 recebida com a conta certa.
   */
  sendPaymentReminder(
    input: WhatsAppPaymentReminderInput,
  ): Promise<{ messageId: string | null }>;

  /**
   * Reage com 🆗 na mensagem original do lembrete, para sinalizar "pago"
   * sem gerar mensagem nova no chat. Emoji 🆗 (não 👍) DE PROPÓSITO — o
   * gatilho de baixa por reação dispara em qualquer variante de 👍 (ver
   * `isThumbsUpEmoji` em `route.ts`), então a confirmação do sistema
   * nunca pode ser 👍 sob risco de disparar a si mesma (anti-loop).
   */
  reactToPaymentConfirmed(
    input: WhatsAppPaymentConfirmedReactionInput,
  ): Promise<void>;
}
