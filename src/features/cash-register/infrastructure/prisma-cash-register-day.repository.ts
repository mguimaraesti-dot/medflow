import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import { buildPaginatedResult } from "@/shared/lib/pagination";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  CashRegisterDayRepository,
  ListCashRegisterDaysFilter,
  CreateCashRegisterDayInput,
  CloseCashRegisterDayInput,
  ConfirmHandoffInput,
  RejectConferenceInput,
  ReopenCashRegisterDayInput,
} from "../domain/cash-register-day.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";

const OPENED_BY_INCLUDE = { openedBy: { select: { name: true } } } as const;

type RowWithOpenedBy = Prisma.CashRegisterDayGetPayload<{
  include: typeof OPENED_BY_INCLUDE;
}>;

/** Achata `row.openedBy.name` no campo denormalizado do domínio — nunca expõe o tipo do Prisma. */
function toDomainDay(row: RowWithOpenedBy): CashRegisterDay {
  const { openedBy, ...day } = row;
  return { ...day, openedByUserName: openedBy.name };
}

export class PrismaCashRegisterDayRepository implements CashRegisterDayRepository {
  async findById(id: string): Promise<CashRegisterDay | null> {
    const row = await prisma.cashRegisterDay.findUnique({
      where: { id },
      include: OPENED_BY_INCLUDE,
    });
    return row ? toDomainDay(row) : null;
  }

  async findByOrganizationAndDate(
    organizationId: string,
    date: Date,
  ): Promise<CashRegisterDay | null> {
    const row = await prisma.cashRegisterDay.findUnique({
      where: { organizationId_date: { organizationId, date } },
      include: OPENED_BY_INCLUDE,
    });
    return row ? toDomainDay(row) : null;
  }

  async findLastClosed(
    organizationId: string,
  ): Promise<CashRegisterDay | null> {
    const row = await prisma.cashRegisterDay.findFirst({
      where: { organizationId, status: "CLOSED" },
      orderBy: { date: "desc" },
      include: OPENED_BY_INCLUDE,
    });
    return row ? toDomainDay(row) : null;
  }

  async findOpenByOrganization(
    organizationId: string,
  ): Promise<CashRegisterDay | null> {
    const row = await prisma.cashRegisterDay.findFirst({
      where: { organizationId, status: "OPEN" },
      orderBy: { date: "desc" },
      include: OPENED_BY_INCLUDE,
    });
    return row ? toDomainDay(row) : null;
  }

  async findPendingConferenceByOrganization(
    organizationId: string,
  ): Promise<CashRegisterDay | null> {
    const row = await prisma.cashRegisterDay.findFirst({
      where: { organizationId, status: "PENDING_CONFERENCE" },
      orderBy: { date: "desc" },
      include: OPENED_BY_INCLUDE,
    });
    return row ? toDomainDay(row) : null;
  }

  async list(
    filter: ListCashRegisterDaysFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<CashRegisterDay>> {
    const where: Prisma.CashRegisterDayWhereInput = {
      organizationId: filter.organizationId,
      ...((filter.dateFrom || filter.dateTo) && {
        date: {
          ...(filter.dateFrom && { gte: filter.dateFrom }),
          ...(filter.dateTo && { lte: filter.dateTo }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.cashRegisterDay.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: OPENED_BY_INCLUDE,
      }),
      prisma.cashRegisterDay.count({ where }),
    ]);

    return buildPaginatedResult(items.map(toDomainDay), total, pagination);
  }

  /**
   * Cria o dia de caixa e retira `openingBalance` do Cofre da
   * organização (`SafeMovement` tipo `FUNDING`) na mesma transação.
   * Duplicamos aqui a leitura/escrita de `tx.safe`/`tx.safeMovement` em
   * vez de importar a infraestrutura de `treasury` — mesmo padrão já
   * usado em `PrismaAccountsPayableRepository.markAsPaid` (Coding
   * Standards, item 18.2).
   */
  async create(data: CreateCashRegisterDayInput): Promise<CashRegisterDay> {
    return prisma.$transaction(async (tx) => {
      const safe = await tx.safe.findUniqueOrThrow({
        where: { organizationId: data.organizationId },
      });

      const [funding, credits, manualAdjustment] = await Promise.all([
        tx.safeMovement.aggregate({
          where: { safeId: safe.id, type: "FUNDING" },
          _sum: { amount: true },
        }),
        tx.safeMovement.aggregate({
          where: {
            safeId: safe.id,
            type: { in: ["SANGRIA", "CASH_REGISTER_HANDOFF"] },
          },
          _sum: { amount: true },
        }),
        tx.safeMovement.aggregate({
          where: { safeId: safe.id, type: "MANUAL_ADJUSTMENT" },
          _sum: { amount: true },
        }),
      ]);

      const safeBalance = (credits._sum.amount ?? new Prisma.Decimal(0))
        .plus(manualAdjustment._sum.amount ?? new Prisma.Decimal(0))
        .minus(funding._sum.amount ?? new Prisma.Decimal(0));

      // Rede de segurança contra corrida entre duas aberturas quase
      // simultâneas — a checagem "de verdade" (com InsufficientSafeBalanceError)
      // já rodou no use case antes de chamar este método.
      if (safeBalance.lessThan(data.openingBalance)) {
        throw new Error(
          `Saldo do Cofre insuficiente para abrir o caixa (organização ${data.organizationId}).`,
        );
      }

      const cashRegisterDay = await tx.cashRegisterDay.create({
        data: {
          organizationId: data.organizationId,
          date: data.date,
          openingBalance: data.openingBalance,
          openedByUserId: data.openedByUserId,
        },
        include: OPENED_BY_INCLUDE,
      });

      await tx.safeMovement.create({
        data: {
          organizationId: data.organizationId,
          safeId: safe.id,
          type: "FUNDING",
          amount: data.openingBalance,
          relatedCashRegisterDayId: cashRegisterDay.id,
          performedByUserId: data.openedByUserId,
        },
      });

      return toDomainDay(cashRegisterDay);
    });
  }

  async close(
    id: string,
    data: CloseCashRegisterDayInput,
  ): Promise<CashRegisterDay> {
    const row = await prisma.cashRegisterDay.update({
      where: { id },
      data: {
        status: "PENDING_CONFERENCE",
        expectedCashAmount: data.expectedCashAmount,
        countedAmount: data.countedAmount,
        difference: data.difference,
        closureNote: data.closureNote,
        closedByUserId: data.closedByUserId,
        closedAt: new Date(),
      },
      include: OPENED_BY_INCLUDE,
    });
    return toDomainDay(row);
  }

  /**
   * Confirma o handoff: muda o status para `CLOSED` e credita o Cofre
   * (`SafeMovement` tipo `CASH_REGISTER_HANDOFF`) na mesma transação —
   * mesmo padrão de `create()` acima.
   */
  async confirmHandoff(
    id: string,
    data: ConfirmHandoffInput,
  ): Promise<CashRegisterDay> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.cashRegisterDay.findUniqueOrThrow({
        where: { id },
      });

      // Rede de segurança contra corrida entre duas confirmações quase
      // simultâneas — a checagem "de verdade" já rodou no use case.
      if (current.status !== "PENDING_CONFERENCE") {
        throw new Error(
          `CashRegisterDay ${id} não está mais aguardando conferência.`,
        );
      }

      const safe = await tx.safe.findUniqueOrThrow({
        where: { organizationId: current.organizationId },
      });

      await tx.safeMovement.create({
        data: {
          organizationId: current.organizationId,
          safeId: safe.id,
          type: "CASH_REGISTER_HANDOFF",
          amount: data.receivedAmount,
          relatedCashRegisterDayId: id,
          performedByUserId: data.handoffConfirmedByUserId,
        },
      });

      const updated = await tx.cashRegisterDay.update({
        where: { id },
        data: {
          status: "CLOSED",
          receivedAmount: data.receivedAmount,
          confirmedDifference: data.confirmedDifference,
          handoffConfirmedByUserId: data.handoffConfirmedByUserId,
          handoffConfirmedAt: new Date(),
          totalIn: data.totalIn,
          totalOut: data.totalOut,
          closingBalance: data.closingBalance,
        },
        include: OPENED_BY_INCLUDE,
      });
      return toDomainDay(updated);
    });
  }

  async rejectConference(
    id: string,
    data: RejectConferenceInput,
  ): Promise<CashRegisterDay> {
    const row = await prisma.cashRegisterDay.update({
      where: { id },
      data: {
        status: "OPEN",
        rejectedAt: new Date(),
        rejectionReason: data.reason,
      },
      include: OPENED_BY_INCLUDE,
    });
    return toDomainDay(row);
  }

  async reopen(
    id: string,
    data: ReopenCashRegisterDayInput,
  ): Promise<CashRegisterDay> {
    const row = await prisma.cashRegisterDay.update({
      where: { id },
      data: {
        status: "OPEN",
        reopenedByUserId: data.reopenedByUserId,
        reopenedAt: new Date(),
        reopenCount: { increment: 1 },
      },
      include: OPENED_BY_INCLUDE,
    });
    return toDomainDay(row);
  }
}
