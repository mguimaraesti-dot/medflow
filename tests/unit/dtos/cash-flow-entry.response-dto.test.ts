import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { toCashFlowEntryResponseDTO } from "@/features/cash-flow/application/dtos/cash-flow-entry.response-dto";
import type { CashFlowEntry } from "@/features/cash-flow/domain/cash-flow-entry.entity";

function buildEntry(overrides: Partial<CashFlowEntry> = {}): CashFlowEntry {
  return {
    id: "entry-1",
    organizationId: "org-1",
    cashRegisterDayId: "day-1",
    type: "IN",
    amount: new Prisma.Decimal("123.4"),
    description: "Consulta",
    occurredAt: new Date("2026-07-03T10:00:00Z"),
    categoryId: "cat-1",
    paymentMethodId: "pm-1",
    accountsPayableId: null,
    patientName: null,
    withdrawalReason: null,
    createdByUserId: "user-1",
    createdByUserName: "Usuário Teste",
    createdAt: new Date("2026-07-03T10:00:00Z"),
    isReversed: false,
    reversalOfEntryId: null,
    ...overrides,
  };
}

describe("toCashFlowEntryResponseDTO", () => {
  it("serializa amount (Decimal) como string com 2 casas decimais", () => {
    const dto = toCashFlowEntryResponseDTO(buildEntry());

    expect(dto.amount).toBe("123.40");
    expect(typeof dto.amount).toBe("string");
  });

  it("preserva os demais campos sem alteração", () => {
    const entry = buildEntry({
      isReversed: true,
      reversalOfEntryId: "entry-0",
    });
    const dto = toCashFlowEntryResponseDTO(entry);

    expect(dto.id).toBe(entry.id);
    expect(dto.type).toBe("IN");
    expect(dto.isReversed).toBe(true);
    expect(dto.reversalOfEntryId).toBe("entry-0");
  });
});
