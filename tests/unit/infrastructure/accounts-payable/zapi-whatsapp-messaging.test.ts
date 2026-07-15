import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZapiWhatsAppMessaging } from "@/features/accounts-payable/infrastructure/zapi-whatsapp-messaging";
import {
  sendButtonListMessage,
  sendButtonCodeMessage,
  sendButtonPixMessage,
} from "@/core/whatsapp/zapi-client";
import { logger } from "@/core/logger/logger";

vi.mock("@/core/whatsapp/zapi-client", () => ({
  sendButtonListMessage: vi.fn(),
  sendButtonCodeMessage: vi.fn(),
  sendButtonPixMessage: vi.fn(),
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
    vi.mocked(sendButtonListMessage).mockResolvedValue({
      messageId: "msg-123",
    });
    vi.mocked(sendButtonCodeMessage).mockResolvedValue(undefined);
    vi.mocked(sendButtonPixMessage).mockResolvedValue(undefined);
  });

  it("passa delayMessage (constante) nas 3 chamadas, sem sleep de código", async () => {
    const messaging = new ZapiWhatsAppMessaging();

    const start = Date.now();
    await messaging.sendPaymentReminder(buildInput());
    const elapsed = Date.now() - start;

    // Sem sleep de código: deve resolver quase instantaneamente (bem
    // abaixo dos 6000ms que os 2x delay(3000) antigos exigiriam).
    expect(elapsed).toBeLessThan(500);

    expect(sendButtonListMessage).toHaveBeenCalledWith(
      expect.objectContaining({ delayMessage: REMINDER_MESSAGE_DELAY_SECONDS }),
    );
    expect(sendButtonCodeMessage).toHaveBeenCalledWith(
      expect.objectContaining({ delayMessage: REMINDER_MESSAGE_DELAY_SECONDS }),
    );
    expect(sendButtonPixMessage).toHaveBeenCalledWith(
      expect.objectContaining({ delayMessage: REMINDER_MESSAGE_DELAY_SECONDS }),
    );
  });

  it("msg 1 (cartão) falha: propaga o erro (lembrete inteiro falha)", async () => {
    const messaging = new ZapiWhatsAppMessaging();
    vi.mocked(sendButtonListMessage).mockRejectedValue(
      new Error("Z-API fora do ar"),
    );

    await expect(messaging.sendPaymentReminder(buildInput())).rejects.toThrow(
      "Z-API fora do ar",
    );

    // Nem boleto nem Pix devem ter sido tentados após a falha crítica.
    expect(sendButtonCodeMessage).not.toHaveBeenCalled();
    expect(sendButtonPixMessage).not.toHaveBeenCalled();
  });

  it("msg 2 (código de barras) falha: não propaga, loga aviso, e a msg 3 (Pix) ainda é tentada", async () => {
    const messaging = new ZapiWhatsAppMessaging();
    vi.mocked(sendButtonCodeMessage).mockRejectedValue(
      new Error("Falha ao enviar boleto"),
    );

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

  it("sem boleto nem Pix cadastrados, envia só o cartão e não loga aviso nenhum", async () => {
    const messaging = new ZapiWhatsAppMessaging();

    const result = await messaging.sendPaymentReminder(
      buildInput({ barcode: null, pixKey: null }),
    );

    expect(result).toEqual({ messageId: "msg-123" });
    expect(sendButtonCodeMessage).not.toHaveBeenCalled();
    expect(sendButtonPixMessage).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
