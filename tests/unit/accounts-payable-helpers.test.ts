import { describe, it, expect } from "vitest";
import {
  buildWhatsAppMessage,
  toAccountsPayableEvents,
} from "@/features/accounts-payable/presentation/accounts-payable-helpers";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import type { AccountsPayableAuditLogEntry } from "@/features/accounts-payable/presentation/use-accounts-payable-audit-log";

describe("buildWhatsAppMessage", () => {
  it("monta o texto com Fornecedor, Descrição, Valor e Vencimento, sem código de barras nem PIX", () => {
    const message = buildWhatsAppMessage({
      supplierName: "Imobiliária Central",
      description: "Aluguel julho",
      amount: "1234.56",
      dueDate: "2026-07-20T00:00:00.000Z",
    });

    expect(message).toBe(
      [
        "⚠️ *Conta a Pagar*",
        "",
        "Fornecedor: *Imobiliária Central*",
        "Descrição: *Aluguel julho*",
        `Valor: *${formatCurrencyBRL("1234.56")}*`,
        `Vencimento: *${formatDateOnlyBR("2026-07-20T00:00:00.000Z")}*`,
      ].join("\n"),
    );
    expect(message).not.toContain("Código de Barras");
    expect(message).not.toContain("Chave PIX");
  });
});

function buildAuditEntry(
  overrides: Partial<AccountsPayableAuditLogEntry> = {},
): AccountsPayableAuditLogEntry {
  return {
    id: "entry-1",
    userId: "user-1",
    userName: "Paula Guimarães",
    entity: "AccountsPayable",
    entityId: "payable-1",
    action: "WHATSAPP_REMINDER_SENT",
    reason: null,
    before: null,
    after: null,
    createdAt: "2026-07-16T16:31:00.000Z",
    ...overrides,
  };
}

describe("toAccountsPayableEvents — lembretes de WhatsApp", () => {
  it("WHATSAPP_REMINDER_SENT automático (userId null) usa redação sem nome de ator", () => {
    const events = toAccountsPayableEvents([
      buildAuditEntry({ userId: null, userName: null }),
    ]);

    expect(events).toHaveLength(1);
    expect(events[0].label).toBe("Lembrete enviado automaticamente");
  });

  it("WHATSAPP_REMINDER_SENT manual credita quem enviou", () => {
    const events = toAccountsPayableEvents([buildAuditEntry()]);

    expect(events[0].label).toBe("Lembrete enviado por Paula Guimarães");
  });

  it("WHATSAPP_REMINDER_FAILED automático usa redação sem nome de ator e expõe o motivo", () => {
    const events = toAccountsPayableEvents([
      buildAuditEntry({
        action: "WHATSAPP_REMINDER_FAILED",
        userId: null,
        userName: null,
        reason: "Z-API fora do ar",
      }),
    ]);

    expect(events[0].label).toBe("Falha ao enviar lembrete automaticamente");
    expect(events[0].detail).toBe("Z-API fora do ar");
  });

  it("WHATSAPP_REMINDER_FAILED manual credita a tentativa de quem clicou", () => {
    const events = toAccountsPayableEvents([
      buildAuditEntry({
        action: "WHATSAPP_REMINDER_FAILED",
        reason: "Z-API fora do ar",
      }),
    ]);

    expect(events[0].label).toBe(
      "Falha ao enviar lembrete (tentativa de Paula Guimarães)",
    );
  });
});
