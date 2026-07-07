import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { toCashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";
import type { CashRegisterDay } from "@/features/cash-register/domain/cash-register-day.entity";

function buildDay(overrides: Partial<CashRegisterDay> = {}): CashRegisterDay {
  return {
    id: "day-1",
    organizationId: "org-1",
    date: new Date("2026-07-03T00:00:00Z"),
    status: "OPEN",
    openingBalance: new Prisma.Decimal("100"),
    totalIn: null,
    totalOut: null,
    closingBalance: null,
    openedByUserId: "user-1",
    openedByUserName: "Maria Guimarães",
    openedAt: new Date("2026-07-03T08:00:00Z"),
    closedByUserId: null,
    closedAt: null,
    reopenedByUserId: null,
    reopenedAt: null,
    reopenCount: 0,
    expectedCashAmount: null,
    countedAmount: null,
    receivedAmount: null,
    difference: null,
    confirmedDifference: null,
    closureNote: null,
    handoffConfirmedByUserId: null,
    handoffConfirmedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    ...overrides,
  };
}

describe("toCashRegisterDayResponseDTO", () => {
  it("serializa openingBalance (Decimal) como string com 2 casas decimais", () => {
    const dto = toCashRegisterDayResponseDTO(buildDay());

    expect(dto.openingBalance).toBe("100.00");
    expect(typeof dto.openingBalance).toBe("string");
  });

  it("mantém totalIn/totalOut/closingBalance como null quando o caixa está aberto", () => {
    const dto = toCashRegisterDayResponseDTO(buildDay());

    expect(dto.totalIn).toBeNull();
    expect(dto.totalOut).toBeNull();
    expect(dto.closingBalance).toBeNull();
  });

  it("serializa totais quando o caixa está fechado", () => {
    const dto = toCashRegisterDayResponseDTO(
      buildDay({
        status: "CLOSED",
        totalIn: new Prisma.Decimal("200"),
        totalOut: new Prisma.Decimal("50"),
        closingBalance: new Prisma.Decimal("250"),
        closedByUserId: "user-1",
        closedAt: new Date("2026-07-03T20:00:00Z"),
      }),
    );

    expect(dto.totalIn).toBe("200.00");
    expect(dto.totalOut).toBe("50.00");
    expect(dto.closingBalance).toBe("250.00");
  });

  it("serializa os campos do Motor de Tesouraria quando PENDING_CONFERENCE", () => {
    const dto = toCashRegisterDayResponseDTO(
      buildDay({
        status: "PENDING_CONFERENCE",
        expectedCashAmount: new Prisma.Decimal("300"),
        countedAmount: new Prisma.Decimal("290"),
        difference: new Prisma.Decimal("-10"),
        closureNote: "Faltou trocar",
        closedByUserId: "user-1",
        closedAt: new Date("2026-07-03T20:00:00Z"),
      }),
    );

    expect(dto.status).toBe("PENDING_CONFERENCE");
    expect(dto.expectedCashAmount).toBe("300.00");
    expect(dto.countedAmount).toBe("290.00");
    expect(dto.difference).toBe("-10.00");
    expect(dto.closureNote).toBe("Faltou trocar");
  });

  it("serializa receivedAmount/confirmedDifference após o handoff confirmado", () => {
    const dto = toCashRegisterDayResponseDTO(
      buildDay({
        status: "CLOSED",
        receivedAmount: new Prisma.Decimal("280"),
        confirmedDifference: new Prisma.Decimal("-10"),
        handoffConfirmedByUserId: "manager-1",
        handoffConfirmedAt: new Date("2026-07-03T21:00:00Z"),
      }),
    );

    expect(dto.receivedAmount).toBe("280.00");
    expect(dto.confirmedDifference).toBe("-10.00");
    expect(dto.handoffConfirmedByUserId).toBe("manager-1");
    expect(dto.handoffConfirmedAt).toEqual(new Date("2026-07-03T21:00:00Z"));
  });

  it("serializa rejectedAt/rejectionReason após conferência rejeitada", () => {
    const dto = toCashRegisterDayResponseDTO(
      buildDay({
        status: "OPEN",
        rejectedAt: new Date("2026-07-03T21:30:00Z"),
        rejectionReason: "Contagem física não bate com o esperado",
      }),
    );

    expect(dto.rejectedAt).toEqual(new Date("2026-07-03T21:30:00Z"));
    expect(dto.rejectionReason).toBe("Contagem física não bate com o esperado");
  });
});
