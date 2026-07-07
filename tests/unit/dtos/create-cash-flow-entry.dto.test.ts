import { describe, it, expect } from "vitest";
import { createCashFlowEntrySchema } from "@/features/cash-flow/application/dtos/create-cash-flow-entry.dto";

const baseInput = {
  amount: 100,
  categoryId: "clx0000000000000000000000",
  paymentMethodId: "clx0000000000000000000000",
};

describe("createCashFlowEntrySchema", () => {
  it("rejeita Entrada sem nome do paciente", () => {
    const result = createCashFlowEntrySchema.safeParse({
      ...baseInput,
      type: "IN",
    });
    expect(result.success).toBe(false);
  });

  it("aceita Entrada com nome do paciente", () => {
    const result = createCashFlowEntrySchema.safeParse({
      ...baseInput,
      type: "IN",
      patientName: "Maria Souza",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita Saída sem justificativa da retirada", () => {
    const result = createCashFlowEntrySchema.safeParse({
      ...baseInput,
      type: "OUT",
    });
    expect(result.success).toBe(false);
  });

  it("aceita Saída com justificativa da retirada", () => {
    const result = createCashFlowEntrySchema.safeParse({
      ...baseInput,
      type: "OUT",
      withdrawalReason: "Troco para o caixa",
    });
    expect(result.success).toBe(true);
  });

  it("não exige justificativa da retirada em Entrada", () => {
    const result = createCashFlowEntrySchema.safeParse({
      ...baseInput,
      type: "IN",
      patientName: "Maria Souza",
    });
    expect(result.success).toBe(true);
  });
});
