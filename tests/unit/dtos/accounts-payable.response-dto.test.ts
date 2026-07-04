import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { toAccountsPayableResponseDTO } from "@/features/accounts-payable/application/dtos/accounts-payable.response-dto";
import type { AccountsPayable } from "@/features/accounts-payable/domain/accounts-payable.entity";

function buildPayable(
  overrides: Partial<AccountsPayable> = {},
): AccountsPayable {
  return {
    id: "payable-1",
    organizationId: "org-1",
    publicToken: "token-1",
    supplierId: "supplier-1",
    categoryId: "cat-1",
    description: "Aluguel",
    amount: new Prisma.Decimal("2000"),
    dueDate: new Date("2026-07-05T00:00:00.000Z"),
    barcode: null,
    digitableLine: null,
    pixKey: null,
    qrCodeUrl: null,
    boletoPdfUrl: null,
    status: "PENDING",
    recurringBillId: null,
    createdByUserId: "user-1",
    paidByUserId: null,
    paidAt: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("toAccountsPayableResponseDTO", () => {
  it("vira OVERDUE quando PENDING e o vencimento já passou", () => {
    const referenceDate = new Date("2026-07-10T00:00:00.000Z");
    const dto = toAccountsPayableResponseDTO(buildPayable(), referenceDate);

    expect(dto.status).toBe("PENDING");
    expect(dto.displayStatus).toBe("OVERDUE");
  });

  it("permanece PENDING quando o vencimento ainda não chegou", () => {
    const referenceDate = new Date("2026-07-01T00:00:00.000Z");
    const dto = toAccountsPayableResponseDTO(buildPayable(), referenceDate);

    expect(dto.displayStatus).toBe("PENDING");
  });

  it("PAID nunca vira OVERDUE, mesmo com vencimento no passado", () => {
    const referenceDate = new Date("2026-07-10T00:00:00.000Z");
    const dto = toAccountsPayableResponseDTO(
      buildPayable({ status: "PAID" }),
      referenceDate,
    );

    expect(dto.displayStatus).toBe("PAID");
  });

  it("CANCELLED nunca vira OVERDUE, mesmo com vencimento no passado", () => {
    const referenceDate = new Date("2026-07-10T00:00:00.000Z");
    const dto = toAccountsPayableResponseDTO(
      buildPayable({ status: "CANCELLED" }),
      referenceDate,
    );

    expect(dto.displayStatus).toBe("CANCELLED");
  });

  it("serializa amount como string decimal fixa", () => {
    const dto = toAccountsPayableResponseDTO(buildPayable());
    expect(dto.amount).toBe("2000.00");
  });
});
