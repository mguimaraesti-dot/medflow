import { describe, it, expect } from "vitest";
import { buildWhatsAppMessage } from "@/features/accounts-payable/presentation/accounts-payable-helpers";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";

describe("buildWhatsAppMessage", () => {
  it("inclui código de barras e PIX quando existem", () => {
    const message = buildWhatsAppMessage({
      supplierName: "Imobiliária Central",
      amount: "1234.56",
      dueDate: "2026-07-20T00:00:00.000Z",
      barcode: "34191790010104351004791020150008291070026000",
      pixKey: "financeiro@imobiliaria.com.br",
    });

    expect(message).toBe(
      [
        "🧾 *Conta a Pagar*",
        "",
        "*Nome:* Imobiliária Central",
        `*Valor:* ${formatCurrencyBRL("1234.56")}`,
        `*Vencimento:* ${formatDateOnlyBR("2026-07-20T00:00:00.000Z")}`,
        "*Código de Barras:* 34191790010104351004791020150008291070026000",
        "*Chave PIX:* financeiro@imobiliaria.com.br",
      ].join("\n"),
    );
  });

  it("omite as linhas de código de barras e PIX quando não existem", () => {
    const message = buildWhatsAppMessage({
      supplierName: "Fornecedor Teste",
      amount: "150",
      dueDate: "2026-07-20T00:00:00.000Z",
      barcode: null,
      pixKey: null,
    });

    expect(message).toBe(
      [
        "🧾 *Conta a Pagar*",
        "",
        "*Nome:* Fornecedor Teste",
        `*Valor:* ${formatCurrencyBRL("150")}`,
        `*Vencimento:* ${formatDateOnlyBR("2026-07-20T00:00:00.000Z")}`,
      ].join("\n"),
    );
    expect(message).not.toContain("Código de Barras");
    expect(message).not.toContain("Chave PIX");
  });
});
