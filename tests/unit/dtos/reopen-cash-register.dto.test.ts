import { describe, it, expect } from "vitest";
import { reopenCashRegisterSchema } from "@/features/cash-register/application/dtos/reopen-cash-register.dto";

describe("reopenCashRegisterSchema", () => {
  // Cenário da matriz: "Reabertura -> Apenas Admin com justificativa" (parte da justificativa)
  it("rejeita reabertura sem justificativa", () => {
    const result = reopenCashRegisterSchema.safeParse({ reason: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita justificativa muito curta (< 10 caracteres)", () => {
    const result = reopenCashRegisterSchema.safeParse({ reason: "curto" });
    expect(result.success).toBe(false);
  });

  it("aceita justificativa válida", () => {
    const result = reopenCashRegisterSchema.safeParse({
      reason: "Erro de digitação no valor lançado às 14h",
    });
    expect(result.success).toBe(true);
  });
});
