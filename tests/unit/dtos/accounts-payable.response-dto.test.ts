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
    paymentOrigin: "BANCO",
    recurringBillId: null,
    occurrenceNumber: null,
    createdByUserId: "user-1",
    createdByUserName: "Marcelo Guimarães",
    paidByUserId: null,
    paidByUserName: null,
    paidAt: null,
    paidVia: null,
    paidSafeMovementId: null,
    attachmentsCount: 0,
    deletedAt: null,
    deletedByUserId: null,
    deletedByUserName: null,
    deletionReason: null,
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

  it("permanece PENDING no próprio dia do vencimento, mesmo mais tarde no dia (nunca compara horário)", () => {
    const referenceDate = new Date("2026-07-05T23:59:00.000Z");
    const dto = toAccountsPayableResponseDTO(
      buildPayable({ dueDate: new Date("2026-07-05T00:00:00.000Z") }),
      referenceDate,
    );

    expect(dto.displayStatus).toBe("PENDING");
  });

  it("vira OVERDUE só a partir do dia seguinte ao vencimento", () => {
    const referenceDate = new Date("2026-07-06T00:00:01.000Z");
    const dto = toAccountsPayableResponseDTO(
      buildPayable({ dueDate: new Date("2026-07-05T00:00:00.000Z") }),
      referenceDate,
    );

    expect(dto.displayStatus).toBe("OVERDUE");
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
