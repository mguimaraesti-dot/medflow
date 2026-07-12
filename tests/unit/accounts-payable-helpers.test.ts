import { describe, it, expect } from "vitest";
import { buildWhatsAppMessage } from "@/features/accounts-payable/presentation/accounts-payable-helpers";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";

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
