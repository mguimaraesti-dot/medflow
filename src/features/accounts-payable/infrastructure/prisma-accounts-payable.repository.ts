import { prisma } from "@/core/database/prisma.client";
import { Prisma } from "@prisma/client";
import { buildPaginatedResult } from "@/shared/lib/pagination";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  AccountsPayableRepository,
  CreateAccountsPayableInput,
  ListAccountsPayableFilter,
  MarkAsPaidInput,
  SoftDeleteAccountsPayableInput,
  UpdateAccountsPayableInput,
} from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { AccountsPayableSummary } from "../domain/accounts-payable-summary.entity";

// Mesmo padrão de join usado em PrismaCashFlowEntryRepository — duplicado
// aqui de propósito (não importamos infraestrutura de outra feature).
const USER_NAMES_INCLUDE = {
  createdBy: { select: { name: true } },
  paidBy: { select: { name: true } },
  deletedBy: { select: { name: true } },
  // Só pra achar o Nº da movimentação do Cofre gerada ao pagar via COFRE
  // (ver toDomain) — no máximo 1 na prática, uma conta só é paga uma vez.
  safeMovements: {
    where: { type: "ACCOUNTS_PAYABLE_PAYMENT" as const },
    take: 1,
    select: { id: true },
  },
} as const;

type AccountsPayableRowWithUserNames = Prisma.AccountsPayableGetPayload<{
  include: typeof USER_NAMES_INCLUDE;
}>;

function toDomain(row: AccountsPayableRowWithUserNames): AccountsPayable {
  const { createdBy, paidBy, deletedBy, safeMovements, ...payable } = row;
  return {
    ...payable,
    createdByUserName: createdBy.name,
    paidByUserName: paidBy?.name ?? null,
    deletedByUserName: deletedBy?.name ?? null,
    paidSafeMovementId: safeMovements[0]?.id ?? null,
  };
}

export class PrismaAccountsPayableRepository implements AccountsPayableRepository {
  async findById(id: string): Promise<AccountsPayable | null> {
    const row = await prisma.accountsPayable.findUnique({
      where: { id },
      include: USER_NAMES_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async list(
    filter: ListAccountsPayableFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<AccountsPayable>> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // "OVERDUE" nunca é persistido — traduz pro par (status PENDING +
    // dueDate no passado). "PENDING" no filtro exclui as vencidas (elas
    // aparecem só no filtro "Vencidas"), mesma lógica do displayStatus.
    let statusFilter: Prisma.AccountsPayableWhereInput = {};
    if (filter.status === "OVERDUE") {
      statusFilter = { status: "PENDING", dueDate: { lt: today } };
    } else if (filter.status === "PENDING") {
      statusFilter = { status: "PENDING", dueDate: { gte: today } };
    } else if (filter.status) {
      statusFilter = { status: filter.status };
    }

    const where: Prisma.AccountsPayableWhereInput = {
      organizationId: filter.organizationId,
      deletedAt: filter.deletedOnly ? { not: null } : null,
      ...statusFilter,
      ...(filter.supplierId && { supplierId: filter.supplierId }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
      ...(filter.recurringBillId && {
        recurringBillId: filter.recurringBillId,
      }),
      ...(filter.recurringOnly === "RECURRING" && {
        recurringBillId: { not: null },
      }),
      ...(filter.recurringOnly === "NON_RECURRING" && {
        recurringBillId: null,
      }),
      // "Busca inteligente": casa com descrição, nome do fornecedor
      // (relação — Prisma resolve sem JOIN manual) ou identificadores do
      // boleto (código de barras/linha digitável) — o "número" que o
      // placeholder do campo já promete.
      ...(filter.search && {
        OR: [
          { description: { contains: filter.search, mode: "insensitive" } },
          {
            supplier: {
              name: { contains: filter.search, mode: "insensitive" },
            },
          },
          { barcode: { contains: filter.search, mode: "insensitive" } },
          { digitableLine: { contains: filter.search, mode: "insensitive" } },
        ],
      }),
      ...((filter.dueDateFrom || filter.dueDateTo) && {
        dueDate: {
          ...(filter.dueDateFrom && { gte: filter.dueDateFrom }),
          ...(filter.dueDateTo && { lte: filter.dueDateTo }),
        },
      }),
    };

    const [rows, total] = await Promise.all([
      prisma.accountsPayable.findMany({
        where,
        include: USER_NAMES_INCLUDE,
        orderBy: { dueDate: "asc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.accountsPayable.count({ where }),
    ]);

    return buildPaginatedResult(rows.map(toDomain), total, pagination);
  }

  async create(data: CreateAccountsPayableInput): Promise<AccountsPayable> {
    const row = await prisma.accountsPayable.create({
      data: {
        organizationId: data.organizationId,
        supplierId: data.supplierId,
        categoryId: data.categoryId,
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate,
        barcode: data.barcode,
        digitableLine: data.digitableLine,
        pixKey: data.pixKey,
        qrCodeUrl: data.qrCodeUrl,
        boletoPdfUrl: data.boletoPdfUrl,
        paymentOrigin: data.paymentOrigin ?? "BANCO",
        recurringBillId: data.recurringBillId,
        occurrenceNumber: data.occurrenceNumber,
        createdByUserId: data.createdByUserId,
      },
      include: USER_NAMES_INCLUDE,
    });
    return toDomain(row);
  }

  async update(
    id: string,
    data: UpdateAccountsPayableInput,
  ): Promise<AccountsPayable> {
    const row = await prisma.accountsPayable.update({
      where: { id },
      data: {
        supplierId: data.supplierId,
        categoryId: data.categoryId,
        description: data.description,
        dueDate: data.dueDate,
        paymentOrigin: data.paymentOrigin,
        barcode: data.barcode,
        pixKey: data.pixKey,
      },
      include: USER_NAMES_INCLUDE,
    });
    return toDomain(row);
  }

  async listByRecurringBill(
    recurringBillId: string,
  ): Promise<AccountsPayable[]> {
    const rows = await prisma.accountsPayable.findMany({
      where: { recurringBillId },
      include: USER_NAMES_INCLUDE,
      orderBy: { occurrenceNumber: "asc" },
    });
    return rows.map(toDomain);
  }

  async listByRecurringBillIdsInRange(
    recurringBillIds: string[],
    dueDateFrom: Date,
    dueDateTo: Date,
  ): Promise<AccountsPayable[]> {
    const rows = await prisma.accountsPayable.findMany({
      where: {
        recurringBillId: { in: recurringBillIds },
        dueDate: { gte: dueDateFrom, lte: dueDateTo },
        deletedAt: null,
      },
      include: USER_NAMES_INCLUDE,
      orderBy: { dueDate: "asc" },
    });
    return rows.map(toDomain);
  }

  /**
   * `paymentOrigin` BANCO: só marca o ciclo de vida, sem tocar o Cofre
   * (comportamento idêntico ao de antes desta feature). `paymentOrigin`
   * COFRE: dentro da mesma transação, recalcula o saldo do Cofre (rede de
   * segurança contra corrida — a checagem "de verdade" já rodou no use
   * case), cria o `SafeMovement` vinculado e só então marca a conta como
   * paga — mesmo padrão de `PrismaCashRegisterDayRepository.create()`
   * (Coding Standards, item 18.2).
   */
  async markAsPaid(
    id: string,
    data: MarkAsPaidInput,
  ): Promise<AccountsPayable> {
    if (data.paymentOrigin !== "COFRE") {
      const row = await prisma.accountsPayable.update({
        where: { id },
        data: {
          status: "PAID",
          paidByUserId: data.paidByUserId,
          paidAt: new Date(),
          paidVia: data.paidVia,
        },
        include: USER_NAMES_INCLUDE,
      });
      return toDomain(row);
    }

    return prisma.$transaction(async (tx) => {
      const payable = await tx.accountsPayable.findUniqueOrThrow({
        where: { id },
      });

      const safe = await tx.safe.findUniqueOrThrow({
        where: { organizationId: data.organizationId },
      });

      const [funding, credits, manualAdjustment] = await Promise.all([
        tx.safeMovement.aggregate({
          where: {
            safeId: safe.id,
            type: { in: ["FUNDING", "ACCOUNTS_PAYABLE_PAYMENT"] },
          },
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

      // Rede de segurança contra corrida entre dois pagamentos via Cofre
      // quase simultâneos — a checagem "de verdade" (com
      // InsufficientSafeBalanceError) já rodou no use case antes de
      // chamar este método.
      if (safeBalance.lessThan(data.amount)) {
        throw new Error(
          `Saldo do Cofre insuficiente para pagar a conta (organização ${data.organizationId}).`,
        );
      }

      await tx.safeMovement.create({
        data: {
          organizationId: data.organizationId,
          safeId: safe.id,
          type: "ACCOUNTS_PAYABLE_PAYMENT",
          amount: data.amount,
          relatedAccountsPayableId: id,
          performedByUserId: data.paidByUserId,
          reason: `Pagamento de "${payable.description}"`,
        },
      });

      const row = await tx.accountsPayable.update({
        where: { id },
        data: {
          status: "PAID",
          paidByUserId: data.paidByUserId,
          paidAt: new Date(),
          paidVia: data.paidVia,
        },
        include: USER_NAMES_INCLUDE,
      });

      return toDomain(row);
    });
  }

  async cancel(id: string): Promise<AccountsPayable> {
    const row = await prisma.accountsPayable.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: USER_NAMES_INCLUDE,
    });
    return toDomain(row);
  }

  async softDelete(
    id: string,
    data: SoftDeleteAccountsPayableInput,
  ): Promise<AccountsPayable> {
    const row = await prisma.accountsPayable.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedByUserId: data.deletedByUserId,
        deletionReason: data.deletionReason,
      },
      include: USER_NAMES_INCLUDE,
    });
    return toDomain(row);
  }

  async restore(id: string): Promise<AccountsPayable> {
    const row = await prisma.accountsPayable.update({
      where: { id },
      data: { deletedAt: null, deletedByUserId: null, deletionReason: null },
      include: USER_NAMES_INCLUDE,
    });
    return toDomain(row);
  }

  async getSummary(
    organizationId: string,
    period: { dueDateFrom?: Date; dueDateTo?: Date },
  ): Promise<AccountsPayableSummary> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setUTCHours(23, 59, 59, 999);
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setUTCHours(23, 59, 59, 999);

    const periodRange = {
      ...(period.dueDateFrom && { gte: period.dueDateFrom }),
      ...(period.dueDateTo && { lte: period.dueDateTo }),
    };

    const baseWhere: Prisma.AccountsPayableWhereInput = { organizationId };

    const [dueToday, dueYesterday, upcoming, overdue, paid] = await Promise.all(
      [
        prisma.accountsPayable.aggregate({
          where: {
            ...baseWhere,
            status: "PENDING",
            dueDate: { ...periodRange, gte: today, lte: endOfToday },
          },
          _count: true,
          _sum: { amount: true },
        }),
        // Só para a tendência do card "Hoje" (vs. ontem) — nunca entra no `total`.
        prisma.accountsPayable.aggregate({
          where: {
            ...baseWhere,
            status: "PENDING",
            dueDate: { ...periodRange, gte: yesterday, lte: endOfYesterday },
          },
          _count: true,
          _sum: { amount: true },
        }),
        prisma.accountsPayable.aggregate({
          where: {
            ...baseWhere,
            status: "PENDING",
            dueDate: { ...periodRange, gt: endOfToday },
          },
          _count: true,
          _sum: { amount: true },
        }),
        prisma.accountsPayable.aggregate({
          where: {
            ...baseWhere,
            status: "PENDING",
            dueDate: { ...periodRange, lt: today },
          },
          _count: true,
          _sum: { amount: true },
        }),
        prisma.accountsPayable.aggregate({
          where: {
            ...baseWhere,
            status: "PAID",
            dueDate: periodRange,
          },
          _count: true,
          _sum: { amount: true },
        }),
      ],
    );

    const toBucket = (result: {
      _count: number;
      _sum: { amount: Prisma.Decimal | null };
    }) => ({
      count: result._count,
      amount: result._sum.amount ?? new Prisma.Decimal(0),
    });

    const dueTodayBucket = toBucket(dueToday);
    const dueYesterdayBucket = toBucket(dueYesterday);
    const upcomingBucket = toBucket(upcoming);
    const overdueBucket = toBucket(overdue);
    const paidBucket = toBucket(paid);

    return {
      dueToday: dueTodayBucket,
      dueYesterday: dueYesterdayBucket,
      upcoming: upcomingBucket,
      overdue: overdueBucket,
      paid: paidBucket,
      total: {
        count:
          dueTodayBucket.count +
          upcomingBucket.count +
          overdueBucket.count +
          paidBucket.count,
        amount: dueTodayBucket.amount
          .plus(upcomingBucket.amount)
          .plus(overdueBucket.amount)
          .plus(paidBucket.amount),
      },
    };
  }
}
