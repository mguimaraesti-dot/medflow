import { prisma } from "@/core/database/prisma.client";
import { Prisma } from "@prisma/client";
import { buildPaginatedResult } from "@/shared/lib/pagination";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  CashFlowEntryRepository,
  CreateCashFlowEntryInput,
  ListCashFlowEntriesFilter,
  CashFlowEntrySums,
} from "../domain/cash-flow-entry.repository";
import type { CashFlowEntry } from "../domain/cash-flow-entry.entity";

export class PrismaCashFlowEntryRepository implements CashFlowEntryRepository {
  async findById(id: string): Promise<CashFlowEntry | null> {
    return prisma.cashFlowEntry.findUnique({ where: { id } });
  }

  async list(
    filter: ListCashFlowEntriesFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<CashFlowEntry>> {
    const where: Prisma.CashFlowEntryWhereInput = {
      organizationId: filter.organizationId,
      ...(filter.cashRegisterDayId && {
        cashRegisterDayId: filter.cashRegisterDayId,
      }),
      ...(filter.type && { type: filter.type }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
    };

    const [items, total] = await Promise.all([
      prisma.cashFlowEntry.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.cashFlowEntry.count({ where }),
    ]);

    return buildPaginatedResult(items, total, pagination);
  }

  async create(data: CreateCashFlowEntryInput): Promise<CashFlowEntry> {
    return prisma.cashFlowEntry.create({
      data: {
        organizationId: data.organizationId,
        cashRegisterDayId: data.cashRegisterDayId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        occurredAt: data.occurredAt ?? new Date(),
        categoryId: data.categoryId,
        paymentMethodId: data.paymentMethodId,
        accountsPayableId: data.accountsPayableId,
        createdByUserId: data.createdByUserId,
      },
    });
  }

  /**
   * Regra de dupla checagem intencional: o use case (Task 5A) já valida
   * `isReversed` antes de chamar este método — isso dá uma mensagem de
   * erro rápida e é o que cobre o cenário "duplo estorno" nos testes
   * unitários. Esta segunda checagem, aqui dentro da transação, é uma
   * rede de segurança contra corrida entre duas requisições simultâneas
   * tentando estornar o mesmo lançamento ao mesmo tempo — algo que só um
   * teste de integração real contra o banco conseguiria pegar.
   */
  async reverse(
    entryId: string,
    reversedByUserId: string,
    description?: string,
  ): Promise<{ original: CashFlowEntry; reversal: CashFlowEntry }> {
    return prisma.$transaction(async (tx) => {
      const original = await tx.cashFlowEntry.findUniqueOrThrow({
        where: { id: entryId },
      });

      if (original.isReversed) {
        throw new Error(`CashFlowEntry ${entryId} já foi estornado.`);
      }

      const reversal = await tx.cashFlowEntry.create({
        data: {
          organizationId: original.organizationId,
          cashRegisterDayId: original.cashRegisterDayId,
          type: original.type === "IN" ? "OUT" : "IN",
          amount: original.amount,
          description:
            description ?? `Estorno referente ao lançamento #${original.id}`,
          categoryId: original.categoryId,
          paymentMethodId: original.paymentMethodId,
          createdByUserId: reversedByUserId,
          reversalOfEntryId: original.id,
        },
      });

      const updatedOriginal = await tx.cashFlowEntry.update({
        where: { id: original.id },
        data: { isReversed: true },
      });

      return { original: updatedOriginal, reversal };
    });
  }

  async sumByCashRegisterDay(
    cashRegisterDayId: string,
  ): Promise<CashFlowEntrySums> {
    const [inSum, outSum] = await Promise.all([
      prisma.cashFlowEntry.aggregate({
        where: { cashRegisterDayId, type: "IN" },
        _sum: { amount: true },
      }),
      prisma.cashFlowEntry.aggregate({
        where: { cashRegisterDayId, type: "OUT" },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalIn: (inSum._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      totalOut: (outSum._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    };
  }
}
