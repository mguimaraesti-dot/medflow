import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZapiWhatsAppMessaging } from "@/features/accounts-payable/infrastructure/zapi-whatsapp-messaging";
import {
  sendTextMessage,
  sendButtonPixMessage,
  sendMessageReactionMessage,
} from "@/core/whatsapp/zapi-client";
import { logger } from "@/core/logger/logger";

vi.mock("@/core/whatsapp/zapi-client", () => ({
  sendTextMessage: vi.fn(),
  sendButtonPixMessage: vi.fn(),
  sendMessageReactionMessage: vi.fn(),
}));

vi.mock("@/core/logger/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const REMINDER_MESSAGE_DELAY_SECONDS = 5;

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    accountsPayableId: "payable-1",
    phone: "11999999999",
    supplierName: "Fornecedor Teste",
    description: "Aluguel",
    amount: "R$ 150,00",
    dueDate: "20/07/2026",
    barcode: "12345",
    pixKey: "pix-key-1",
    ...overrides,
  };
}

describe("ZapiWhatsAppMessaging.sendPaymentReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Diferencia a resposta pelo conteúdo da mensagem — o cartão
    // principal e o código de barras usam a MESMA função
    // (sendTextMessage), então precisam de messageIds distintos pra os
    // testes conseguirem afirmar qual é qual.
    vi.mocked(sendTextMessage).mockImplementation(async (input) => {
      if (input.message.startsWith("⚠️ *Conta a Pagar*")) {
        return { messageId: "msg-123" };
      }
      return { messageId: "msg-456" };
    });
    vi.mocked(sendButtonPixMessage).mockResolvedValue(undefined);
  });

  it("cartão principal é texto simples (sem botão), com instrução de reação, e messageId é logado", async () => {
    const messaging = new ZapiWhatsAppMessaging();

    const result = await messaging.sendPaymentReminder(buildInput());

    expect(result).toEqual({ messageId: "msg-123" });
    expect(sendTextMessage).toHaveBeenNthCalledWith(1, {
      phone: "11999999999",
      message: expect.stringContaining(
        "_Reaja com 👍 nesta mensagem para dar baixa no pagamento._",
      ),
      delayMessage: REMINDER_MESSAGE_DELAY_SECONDS,
    });
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("messageId capturado"),
      expect.objectContaining({
        accountsPayableId: "payable-1",
        messageId: "msg-123",
      }),
    );
  });

  it("código de barras vira uma 2ª chamada de sendTextMessage com SÓ o código puro (sem título/fornecedor/valor)", async () => {
    const messaging = new ZapiWhatsAppMessaging();

    const start = Date.now();
    await messaging.sendPaymentReminder(buildInput());
    const elapsed = Date.now() - start;

    // Sem sleep de código: deve resolver quase instantaneamente.
    expect(elapsed).toBeLessThan(500);

    expect(sendTextMessage).toHaveBeenCalledTimes(2);
    expect(sendTextMessage).toHaveBeenNthCalledWith(2, {
      phone: "11999999999",
      message: "12345",
      delayMessage: REMINDER_MESSAGE_DELAY_SECONDS,
    });
    expect(sendButtonPixMessage).toHaveBeenCalledWith(
      expect.objectContaining({ delayMessage: REMINDER_MESSAGE_DELAY_SECONDS }),
    );
  });

  it("msg 1 (cartão) falha: propaga o erro (lembrete inteiro falha)", async () => {
    const messaging = new ZapiWhatsAppMessaging();
    vi.mocked(sendTextMessage).mockReset();
    vi.mocked(sendTextMessage).mockRejectedValueOnce(
      new Error("Z-API fora do ar"),
    );

    await expect(messaging.sendPaymentReminder(buildInput())).rejects.toThrow(
      "Z-API fora do ar",
    );

    // Só a 1ª chamada (cartão) foi tentada — nem boleto nem Pix depois
    // da falha crítica.
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
    expect(sendButtonPixMessage).not.toHaveBeenCalled();
  });

  it("msg 2 (código de barras) falha: não propaga, loga aviso, e a msg 3 (Pix) ainda é tentada", async () => {
    const messaging = new ZapiWhatsAppMessaging();
    vi.mocked(sendTextMessage).mockReset();
    vi.mocked(sendTextMessage).mockImplementation(async (input) => {
      if (input.message.startsWith("⚠️ *Conta a Pagar*")) {
        return { messageId: "msg-123" };
      }
      throw new Error("Falha ao enviar boleto");
    });

    const result = await messaging.sendPaymentReminder(buildInput());

    expect(result).toEqual({ messageId: "msg-123" });
    expect(sendButtonPixMessage).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("código de barras"),
      expect.objectContaining({
        accountsPayableId: "payable-1",
        error: "Falha ao enviar boleto",
      }),
    );
  });

  it("msg 3 (Pix) falha: não propaga, loga aviso, e o lembrete é considerado enviado", async () => {
    const messaging = new ZapiWhatsAppMessaging();
    vi.mocked(sendButtonPixMessage).mockRejectedValue(
      new Error("Falha ao enviar Pix"),
    );

    const result = await messaging.sendPaymentReminder(buildInput());

    expect(result).toEqual({ messageId: "msg-123" });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Pix"),
      expect.objectContaining({
        accountsPayableId: "payable-1",
        error: "Falha ao enviar Pix",
      }),
    );
  });

  it("sem boleto nem Pix cadastrados, envia só o cartão (1 chamada de sendTextMessage) e não loga aviso nenhum", async () => {
    const messaging = new ZapiWhatsAppMessaging();

    const result = await messaging.sendPaymentReminder(
      buildInput({ barcode: null, pixKey: null }),
    );

    expect(result).toEqual({ messageId: "msg-123" });
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
    expect(sendButtonPixMessage).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe("ZapiWhatsAppMessaging.reactToPaymentConfirmed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendMessageReactionMessage).mockResolvedValue(undefined);
  });

  it("reage com 🆗 (não 👍) — emoji diferente do gatilho de baixa por reação, evita loop", async () => {
    const messaging = new ZapiWhatsAppMessaging();

    await messaging.reactToPaymentConfirmed({
      phone: "11999999999",
      messageId: "msg-original-1",
    });

    expect(sendMessageReactionMessage).toHaveBeenCalledWith({
      phone: "11999999999",
      messageId: "msg-original-1",
      reaction: "🆗",
    });
  });
});
