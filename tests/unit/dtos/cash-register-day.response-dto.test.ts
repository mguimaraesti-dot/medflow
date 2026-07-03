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
    openedAt: new Date("2026-07-03T08:00:00Z"),
    closedByUserId: null,
    closedAt: null,
    reopenedByUserId: null,
    reopenedAt: null,
    reopenCount: 0,
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
});
