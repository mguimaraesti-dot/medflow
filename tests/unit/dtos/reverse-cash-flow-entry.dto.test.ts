import { describe, it, expect } from "vitest";
import { reverseCashFlowEntrySchema } from "@/features/cash-flow/application/dtos/reverse-cash-flow-entry.dto";

describe("reverseCashFlowEntrySchema", () => {
  // Cenário: "Estorno -> exige justificativa obrigatória" (Refinamento UX Caixa Recepção)
  it("rejeita estorno sem justificativa", () => {
    const result = reverseCashFlowEntrySchema.safeParse({ description: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita justificativa muito curta (< 10 caracteres)", () => {
    const result = reverseCashFlowEntrySchema.safeParse({
      description: "engano",
    });
    expect(result.success).toBe(false);
  });

  it("aceita justificativa válida", () => {
    const result = reverseCashFlowEntrySchema.safeParse({
      description: "Lançamento duplicado por engano",
    });
    expect(result.success).toBe(true);
  });
});
