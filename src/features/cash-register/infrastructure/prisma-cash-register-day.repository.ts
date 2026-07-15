import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import { buildPaginatedResult } from "@/shared/lib/pagination";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  CashRegisterDayRepository,
  ListCashRegisterDaysFilter,
  CreateCashRegisterDayInput,
  CloseCashRegisterDayInput,
  ReopenCashRegisterDayInput,
} from "../domain/cash-register-day.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";

const OPENED_BY_INCLUDE = {
  openedBy: { select: { name: true } },
  closedBy: { select: { name: true } },
  reopenedBy: { select: { name: true } },
} as const;

type RowWithOpenedBy = Prisma.CashRegisterDayGetPayload<{
  include: typeof OPENED_BY_INCLUDE;
}>;

/**
 * Achata `row.openedBy.name`/`row.closedBy.name` nos campos
 * denormalizados do domínio — nunca expõe o tipo do Prisma. O cast de
 * `status` é seguro: nenhum código novo escreve mais
 * `PENDING_CONFERENCE` (dupla conferência removida); o enum do Postgres
 * mantém o valor só por compatibilidade com registros históricos, já
 * migrados para `CLOSED`.
 */
function toDomainDay(row: RowWithOpenedBy): CashRegisterDay {
  const { openedBy, closedBy, reopenedBy, ...day } = row;
  return {
    ...day,
    status: day.status as CashRegisterDay["status"],
    openedByUserName: openedBy.name,
    closedByUserName: closedBy?.name ?? null,
    reopenedByUserName: reopenedBy?.name ?? null,
    // Não existe coluna pra isso — só o use case de "hoje" populado ao
    // vivo enquanto OPEN (ver comentário no domínio).
    cashIn: null,
  };
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

  async findOldestOpenBefore(
    organizationId: string,
    date: Date,
  ): Promise<CashRegisterDay | null> {
    const row = await prisma.cashRegisterDay.findFirst({
      where: { organizationId, status: "OPEN", date: { lt: date } },
      orderBy: { date: "asc" },
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
          where: {
            safeId: safe.id,
            status: "CONFIRMED",
            type: { in: ["FUNDING", "ACCOUNTS_PAYABLE_PAYMENT"] },
          },
          _sum: { amount: true },
        }),
        tx.safeMovement.aggregate({
          where: {
            safeId: safe.id,
            status: "CONFIRMED",
            type: { in: ["SANGRIA", "CASH_REGISTER_HANDOFF"] },
          },
          _sum: { amount: true },
        }),
        tx.safeMovement.aggregate({
          where: {
            safeId: safe.id,
            status: "CONFIRMED",
            type: "MANUAL_ADJUSTMENT",
          },
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

  /**
   * Fecha direto pra `CLOSED` (dupla conferência do próprio fechamento
   * continua removida — a Secretária fecha sozinha, sem trava). Na mesma
   * transação, cria um `SafeMovement` `CASH_REGISTER_HANDOFF`/`PENDING`
   * com `handoffAmount` (`countedAmount` já líquido do que fechamentos
   * anteriores do mesmo dia já confirmaram — ver
   * `close-cash-register.use-case.ts`) — ele só passa a valer no saldo
   * do Cofre quando um Gerente confirma (`confirm-safe-movement.use-case`),
   * mesmo padrão de atomicidade já usado em `create()` (que já cria
   * `FUNDING` na mesma transação).
   */
  async close(
    id: string,
    data: CloseCashRegisterDayInput,
  ): Promise<CashRegisterDay> {
    return prisma.$transaction(async (tx) => {
      const cashRegisterDay = await tx.cashRegisterDay.findUniqueOrThrow({
        where: { id },
      });

      const safe = await tx.safe.findUniqueOrThrow({
        where: { organizationId: cashRegisterDay.organizationId },
      });

      const row = await tx.cashRegisterDay.update({
        where: { id },
        data: {
          status: "CLOSED",
          expectedCashAmount: data.expectedCashAmount,
          countedAmount: data.countedAmount,
          difference: data.difference,
          totalIn: data.totalIn,
          totalOut: data.totalOut,
          closingBalance: data.closingBalance,
          closureNote: data.closureNote,
          closedByUserId: data.closedByUserId,
          closedAt: new Date(),
        },
        include: OPENED_BY_INCLUDE,
      });

      await tx.safeMovement.create({
        data: {
          organizationId: cashRegisterDay.organizationId,
          safeId: safe.id,
          type: "CASH_REGISTER_HANDOFF",
          status: "PENDING",
          amount: data.handoffAmount,
          relatedCashRegisterDayId: id,
          performedByUserId: data.closedByUserId,
        },
      });

      return toDomainDay(row);
    });
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
