import { describe, it, expect, vi } from "vitest";
import { createRecurringAccountsPayableUseCase } from "@/features/accounts-payable/application/create-recurring-accounts-payable.use-case";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { RecurringBillRepository } from "@/features/recurring-bills/domain/recurring-bill.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { createMany: vi.fn() } },
}));

function buildDeps() {
  const createMany = vi
    .fn()
    .mockImplementation((items: Record<string, unknown>[]) =>
      items.map((data) => ({
        id: `payable-${data.occurrenceNumber}`,
        ...data,
      })),
    );
  const accountsPayableRepository = {
    createMany,
  } as unknown as AccountsPayableRepository;

  const recurringBillRepository = {
    create: vi.fn().mockResolvedValue({ id: "recurring-1" }),
  } as unknown as RecurringBillRepository;

  return { accountsPayableRepository, recurringBillRepository, createMany };
}

describe("createRecurringAccountsPayableUseCase", () => {
  it("gera exatamente N ocorrências quando maxOccurrences é informado, num único createMany", async () => {
    const { accountsPayableRepository, recurringBillRepository, createMany } =
      buildDeps();

    const result = await createRecurringAccountsPayableUseCase(
      {
        supplierId: "supplier-1",
        categoryId: "cat-1",
        description: "Aluguel",
        amount: 1000,
        firstDueDate: new Date("2026-07-05T00:00:00.000Z"),
        periodicity: "MONTHLY",
        maxOccurrences: 3,
        paymentOrigin: "BANCO",
      },
      "user-1",
      "org-1",
      { accountsPayableRepository, recurringBillRepository },
    );

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(createMany.mock.calls[0][0]).toHaveLength(3);
    expect(result.payables).toHaveLength(3);
  });

  it("gera um lote fixo de 12 ocorrências quando é sem prazo", async () => {
    const { accountsPayableRepository, recurringBillRepository, createMany } =
      buildDeps();

    await createRecurringAccountsPayableUseCase(
      {
        supplierId: "supplier-1",
        categoryId: "cat-1",
        description: "Internet",
        amount: 200,
        firstDueDate: new Date("2026-07-05T00:00:00.000Z"),
        periodicity: "MONTHLY",
        paymentOrigin: "BANCO",
      },
      "user-1",
      "org-1",
      { accountsPayableRepository, recurringBillRepository },
    );

    expect(createMany.mock.calls[0][0]).toHaveLength(12);
  });

  it("só a 1ª ocorrência recebe os dados do boleto — as próximas não copiam", async () => {
    const { accountsPayableRepository, recurringBillRepository, createMany } =
      buildDeps();

    await createRecurringAccountsPayableUseCase(
      {
        supplierId: "supplier-1",
        categoryId: "cat-1",
        description: "Aluguel",
        amount: 1000,
        firstDueDate: new Date("2026-07-05T00:00:00.000Z"),
        periodicity: "MONTHLY",
        maxOccurrences: 2,
        barcode: "00000000000",
        paymentOrigin: "BANCO",
      },
      "user-1",
      "org-1",
      { accountsPayableRepository, recurringBillRepository },
    );

    const items = createMany.mock.calls[0][0];
    expect(items[0]).toMatchObject({ barcode: "00000000000" });
    expect(items[1]).toMatchObject({ barcode: undefined });
  });

  it("calcula os vencimentos avançando por periodicidade (mensal)", async () => {
    const { accountsPayableRepository, recurringBillRepository, createMany } =
      buildDeps();

    await createRecurringAccountsPayableUseCase(
      {
        supplierId: "supplier-1",
        categoryId: "cat-1",
        description: "Aluguel",
        amount: 1000,
        firstDueDate: new Date("2026-01-05T00:00:00.000Z"),
        periodicity: "MONTHLY",
        maxOccurrences: 3,
        paymentOrigin: "BANCO",
      },
      "user-1",
      "org-1",
      { accountsPayableRepository, recurringBillRepository },
    );

    const dueDates = createMany.mock.calls[0][0].map(
      (item: { dueDate: Date }) => item.dueDate.toISOString(),
    );
    expect(dueDates).toEqual([
      "2026-01-05T00:00:00.000Z",
      "2026-02-05T00:00:00.000Z",
      "2026-03-05T00:00:00.000Z",
    ]);
  });
});
