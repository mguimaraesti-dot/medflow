import { describe, it, expect } from "vitest";
import { buildWhatsAppMessage } from "@/features/accounts-payable/presentation/accounts-payable-helpers";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";

describe("buildWhatsAppMessage", () => {
  it("monta o cabeçalho com Nome, Vencimento e Valor, sem código de barras nem PIX", () => {
    const message = buildWhatsAppMessage({
      supplierName: "Imobiliária Central",
      amount: "1234.56",
      dueDate: "2026-07-20T00:00:00.000Z",
    });

    expect(message).toBe(
      [
        "⚠️ *Conta a Pagar*",
        "*Nome:* Imobiliária Central",
        `*Vencimento:* ${formatDateOnlyBR("2026-07-20T00:00:00.000Z")}`,
        `*Valor:* ${formatCurrencyBRL("1234.56")}`,
      ].join("\n"),
    );
    expect(message).not.toContain("Código de Barras");
    expect(message).not.toContain("Chave PIX");
  });
});
