import { logger } from "@/core/logger/logger";
import {
  sendButtonListMessage,
  sendTextMessage,
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

/**
 * TESTE COMPARATIVO (temporário) — duas finalistas pro código de
 * barras, ambas via `/send-text` (histórico completo em
 * `zapi-client.ts`: botão OTP não entrega em grupo/iOS; botão
 * URL-copy copia errado, mesma família OTP; código em bloco de crase
 * no meio do texto seleciona a mensagem inteira ao tocar).
 *
 * "A" (recomendada): mensagem de info SEM o código + segunda mensagem
 * SÓ com o código puro — ao segurar a 2ª mensagem, "copiar" pega ela
 * inteira, que já é só o código.
 * "B": uma mensagem só, código isolado por `\n\n` no final (a testar
 * se dá pra selecionar só ele).
 *
 * TROQUE AQUI ("A" ou "B") e reenvie um lembrete de teste pra comparar
 * no aparelho. Depois que o vencedor for escolhido, remover esta chave
 * e o branch perdedor.
 */
const BARCODE_MESSAGE_MODE: "A" | "B" = "A";

/** Id do botão "Pago" — carrega o `accountsPayableId`, lido direto pelo webhook (ver `handle-zapi-webhook.use-case.ts`). */
function payButtonId(accountsPayableId: string): string {
  return `pago_${accountsPayableId}`;
}

/**
 * Implementa `WhatsAppMessagingPort` sobre a Z-API. Cartão principal
 * ("Pago") e chave Pix usam botão nativo; código de barras está em
 * TESTE COMPARATIVO entre duas versões de texto simples (ver
 * `BARCODE_MESSAGE_MODE` acima e histórico em `zapi-client.ts`). As
 * mensagens de boleto/Pix só são enviadas quando a conta tem o dado
 * correspondente cadastrado — nem toda conta a pagar tem boleto ou
 * chave Pix.
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
    // Cartão com botão "Pago" é a mensagem CRÍTICA: sem ela, nada foi
    // entregue ao dono da conta — a falha aqui propaga (não é
    // capturada), pra que o use case chamador não marque a conta como
    // lembrada e ela seja retentada no próximo ciclo.
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

    // Código de barras e PIX são BEST-EFFORT: o cartão principal já
    // chegou, então uma falha aqui não pode derrubar o lembrete inteiro
    // — isso faria o cartão (já entregue) ser reenviado duplicado no
    // próximo ciclo. Só loga um aviso claro o bastante pra alguém notar
    // que essa conta ficou sem boleto/PIX.
    if (input.barcode) {
      try {
        const infoMessage = `*${input.supplierName}*\n${input.amount}\nCódigo de barras da fatura:`;

        if (BARCODE_MESSAGE_MODE === "A") {
          // VERSÃO A: mensagem 2 é SÓ o código, puro (sem título, sem
          // formatação) — ao segurar pra copiar, "copiar" pega a
          // mensagem inteira, que já é só o código.
          await sendTextMessage({
            phone: input.phone,
            message: infoMessage,
            delayMessage: REMINDER_MESSAGE_DELAY_SECONDS,
          });
          await sendTextMessage({
            phone: input.phone,
            message: input.barcode,
            delayMessage: REMINDER_MESSAGE_DELAY_SECONDS,
          });
        } else {
          // VERSÃO B: uma mensagem só — info + duas quebras de linha +
          // código puro no final, sem formatação nenhuma nele.
          await sendTextMessage({
            phone: input.phone,
            message: `${infoMessage}\n\n${input.barcode}`,
            delayMessage: REMINDER_MESSAGE_DELAY_SECONDS,
          });
        }
      } catch (error) {
        logger.warn(
          "Lembrete de WhatsApp: falha ao enviar código de barras (best-effort — conta segue marcada como lembrada)",
          {
            accountsPayableId: input.accountsPayableId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    if (input.pixKey) {
      try {
        await sendButtonPixMessage({
          phone: input.phone,
          pixKey: input.pixKey,
          pixKeyType: "EVP",
          // Valor primeiro: o cartão nativo de PIX só nos deixa
          // controlar merchantName, e testado em produção o WhatsApp
          // trunca por largura de tela (não por contagem de
          // caracteres) — cortando sempre o fim da string. Com o valor
          // no começo, ele sobrevive ao corte mesmo quando o nome do
          // fornecedor é longo; não faz sentido truncar por tamanho
          // aqui, o próprio WhatsApp já faz isso.
          merchantName: `${input.amount} - ${input.supplierName}`,
          delayMessage: REMINDER_MESSAGE_DELAY_SECONDS,
        });
      } catch (error) {
        logger.warn(
          "Lembrete de WhatsApp: falha ao enviar chave Pix (best-effort — conta segue marcada como lembrada)",
          {
            accountsPayableId: input.accountsPayableId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    return { messageId };
  }
}
