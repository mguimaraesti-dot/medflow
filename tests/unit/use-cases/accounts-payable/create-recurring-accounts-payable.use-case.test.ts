import { describe, it, expect, vi } from "vitest";
import { createRecurringAccountsPayableUseCase } from "@/features/accounts-payable/application/create-recurring-accounts-payable.use-case";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { RecurringBillRepository } from "@/features/recurring-bills/domain/recurring-bill.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

function buildDeps() {
  const create = vi
    .fn()
    .mockImplementation((data: Record<string, unknown>) => ({
      id: `payable-${data.occurrenceNumber}`,
      ...data,
    }));
  const accountsPayableRepository = {
    create,
  } as unknown as AccountsPayableRepository;

  const recurringBillRepository = {
    create: vi.fn().mockResolvedValue({ id: "recurring-1" }),
  } as unknown as RecurringBillRepository;

  return { accountsPayableRepository, recurringBillRepository, create };
}

describe("createRecurringAccountsPayableUseCase", () => {
  it("gera exatamente N ocorrências quando maxOccurrences é informado", async () => {
    const { accountsPayableRepository, recurringBillRepository, create } =
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

    expect(create).toHaveBeenCalledTimes(3);
    expect(result.payables).toHaveLength(3);
  });

  it("gera um lote fixo de 12 ocorrências quando é sem prazo", async () => {
    const { accountsPayableRepository, recurringBillRepository, create } =
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

    expect(create).toHaveBeenCalledTimes(12);
  });

  it("só a 1ª ocorrência recebe os dados do boleto — as próximas não copiam", async () => {
    const { accountsPayableRepository, recurringBillRepository, create } =
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

    expect(create.mock.calls[0][0]).toMatchObject({ barcode: "00000000000" });
    expect(create.mock.calls[1][0]).toMatchObject({ barcode: undefined });
  });

  it("calcula os vencimentos avançando por periodicidade (mensal)", async () => {
    const { accountsPayableRepository, recurringBillRepository, create } =
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

    const dueDates = create.mock.calls.map((call) =>
      call[0].dueDate.toISOString(),
    );
    expect(dueDates).toEqual([
      "2026-01-05T00:00:00.000Z",
      "2026-02-05T00:00:00.000Z",
      "2026-03-05T00:00:00.000Z",
    ]);
  });
});
