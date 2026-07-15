import { prisma } from "@/core/database/prisma.client";
import { Prisma } from "@prisma/client";
import { buildPaginatedResult } from "@/shared/lib/pagination";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import { todayDateOnlyBR } from "@/shared/lib/format";
import type {
  AccountsPayableRepository,
  CreateAccountsPayableInput,
  ListAccountsPayableFilter,
  MarkAsPaidInput,
  SoftDeleteAccountsPayableInput,
  UpdateAccountsPayableInput,
  UpdateManyForSeriesInput,
} from "../domain/accounts-payable.repository";
import type {
  AccountsPayable,
  PaymentOrigin,
} from "../domain/accounts-payable.entity";
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
  // Coluna "Documentos" da listagem — conta os anexos reais (Drive), não
  // inclui o boleto legado (`boletoPdfUrl`, que não é uma linha em
  // `AccountsPayableAttachment`).
  _count: { select: { attachments: true } },
} as const;

type AccountsPayableRowWithUserNames = Prisma.AccountsPayableGetPayload<{
  include: typeof USER_NAMES_INCLUDE;
}>;

function toDomain(row: AccountsPayableRowWithUserNames): AccountsPayable {
  const { createdBy, paidBy, deletedBy, safeMovements, _count, ...payable } =
    row;
  return {
    ...payable,
    createdByUserName: createdBy.name,
    paidByUserName: paidBy?.name ?? null,
    deletedByUserName: deletedBy?.name ?? null,
    paidSafeMovementId: safeMovements[0]?.id ?? null,
    attachmentsCount: _count.attachments,
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
    const today = todayDateOnlyBR();

    // "OVERDUE" nunca é persistido — traduz pro par (status PENDING +
    // dueDate no passado). "PENDING" no filtro exclui as vencidas (elas
    // aparecem só no filtro "Vencidas"), mesma lógica do displayStatus.
    // O range de período (dueDateFrom/dueDateTo) precisa ser mesclado no
    // mesmo objeto `dueDate` — dois spreads separados de `dueDate` no
    // `where` não fazem deep-merge, o segundo sobrescreve o primeiro
    // por inteiro e o filtro de status vira um no-op.
    const statusFilter: Prisma.AccountsPayableWhereInput = {};
    const dueDateFilter: Prisma.DateTimeFilter = {};
    if (filter.status === "OVERDUE") {
      statusFilter.status = "PENDING";
      dueDateFilter.lt = today;
    } else if (filter.status === "PENDING") {
      statusFilter.status = "PENDING";
      dueDateFilter.gte = today;
    } else if (filter.status) {
      statusFilter.status = filter.status;
    }
    if (filter.dueDateFrom) {
      dueDateFilter.gte =
        dueDateFilter.gte && dueDateFilter.gte > filter.dueDateFrom
          ? dueDateFilter.gte
          : filter.dueDateFrom;
    }
    if (filter.dueDateTo) {
      dueDateFilter.lte = filter.dueDateTo;
    }

    const where: Prisma.AccountsPayableWhereInput = {
      organizationId: filter.organizationId,
      deletedAt: filter.deletedOnly ? { not: null } : null,
      ...statusFilter,
      ...(Object.keys(dueDateFilter).length > 0 && {
        dueDate: dueDateFilter,
      }),
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
        reminderEnabled: data.reminderEnabled,
        reminderDaysBefore: data.reminderDaysBefore,
      },
      include: USER_NAMES_INCLUDE,
    });
    return toDomain(row);
  }

  /**
   * Um único INSERT em lote (atômico) em vez de N `create()` sequenciais —
   * substitui o loop de criação de ocorrências de uma recorrência. O
   * segundo `findMany` (por `recurringBillId`) é necessário porque
   * `createMany` do Prisma não retorna as linhas inseridas.
   */
  async createMany(
    data: CreateAccountsPayableInput[],
  ): Promise<AccountsPayable[]> {
    if (data.length === 0) return [];

    await prisma.accountsPayable.createMany({
      data: data.map((item) => ({
        organizationId: item.organizationId,
        supplierId: item.supplierId,
        categoryId: item.categoryId,
        description: item.description,
        amount: item.amount,
        dueDate: item.dueDate,
        barcode: item.barcode,
        digitableLine: item.digitableLine,
        pixKey: item.pixKey,
        qrCodeUrl: item.qrCodeUrl,
        boletoPdfUrl: item.boletoPdfUrl,
        paymentOrigin: item.paymentOrigin ?? "BANCO",
        recurringBillId: item.recurringBillId,
        occurrenceNumber: item.occurrenceNumber,
        createdByUserId: item.createdByUserId,
        reminderEnabled: item.reminderEnabled,
        reminderDaysBefore: item.reminderDaysBefore,
      })),
    });

    const recurringBillId = data[0].recurringBillId;
    const rows = await prisma.accountsPayable.findMany({
      where: { recurringBillId },
      include: USER_NAMES_INCLUDE,
      orderBy: { occurrenceNumber: "asc" },
    });
    return rows.map(toDomain);
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
        amount: data.amount,
        dueDate: data.dueDate,
        paymentOrigin: data.paymentOrigin,
        barcode: data.barcode,
        pixKey: data.pixKey,
        reminderEnabled: data.reminderEnabled,
        reminderDaysBefore: data.reminderDaysBefore,
      },
      include: USER_NAMES_INCLUDE,
    });
    return toDomain(row);
  }

  /**
   * Um único UPDATE em lote (`updateMany`) em vez de N `update()`
   * sequenciais — substitui o loop de propagação de edição pras próximas
   * ocorrências PENDENTES de uma recorrência. `dueDate` nunca entra aqui de
   * propósito (cada ocorrência mantém a sua).
   */
  async updateManyForSeries(
    ids: string[],
    data: UpdateManyForSeriesInput,
  ): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await prisma.accountsPayable.updateMany({
      where: { id: { in: ids } },
      data: {
        supplierId: data.supplierId,
        categoryId: data.categoryId,
        description: data.description,
        paymentOrigin: data.paymentOrigin,
      },
    });
    return result.count;
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
   * COFRE: em vez de recalcular o saldo do zero (4 agregações) dentro da
   * transação, reaproveita `data.safeBalance` (já calculado e validado no
   * use case) e usa um `SELECT ... FOR UPDATE` na linha do Cofre só pra
   * serializar pagamentos concorrentes — a checagem de saldo continua
   * acontecendo, só não recomputa o valor do zero uma 2ª vez.
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

      const [safe] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "safes" WHERE "organizationId" = ${data.organizationId} FOR UPDATE
      `;
      if (!safe) {
        throw new Error(
          `Cofre não encontrado para a organização ${data.organizationId}.`,
        );
      }

      const safeBalance = new Prisma.Decimal(data.safeBalance ?? 0);

      // Rede de segurança contra corrida entre dois pagamentos via Cofre
      // quase simultâneos — a checagem "de verdade" (com
      // InsufficientSafeBalanceError) já rodou no use case antes de
      // chamar este método; o lock acima garante que nenhum outro
      // pagamento via Cofre da mesma organização commitou entre a leitura
      // do saldo (no use case) e aqui.
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

  /**
   * Um único UPDATE em lote (`updateMany`) em vez de N `cancel()`
   * sequenciais — substitui o loop de cancelamento das demais ocorrências
   * PENDENTES ao encerrar uma recorrência.
   */
  async cancelMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await prisma.accountsPayable.updateMany({
      where: { id: { in: ids } },
      data: { status: "CANCELLED" },
    });
    return result.count;
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
    const today = todayDateOnlyBR();
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

    // deletedAt: null é essencial aqui — sem isso, uma conta excluída
    // (soft delete) continua contando nos cards de KPI mesmo nunca
    // aparecendo na listagem (que já filtra deletedAt), fazendo o
    // card mostrar uma contagem que a tabela nunca confirma.
    const baseWhere: Prisma.AccountsPayableWhereInput = {
      organizationId,
      deletedAt: null,
    };

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

  async sumPaidByDateRange(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{ count: number; amount: Prisma.Decimal }> {
    const result = await prisma.accountsPayable.aggregate({
      where: {
        organizationId,
        deletedAt: null,
        status: "PAID",
        paidAt: { gte: from, lte: to },
      },
      _count: true,
      _sum: { amount: true },
    });

    return {
      count: result._count,
      amount: result._sum.amount ?? new Prisma.Decimal(0),
    };
  }

  async sumPaidByCategoryAndDateRange(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{ categoryId: string; amount: string }[]> {
    const rows = await prisma.accountsPayable.groupBy({
      by: ["categoryId"],
      where: {
        organizationId,
        deletedAt: null,
        status: "PAID",
        paidAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });

    return rows.map((row) => ({
      categoryId: row.categoryId,
      amount: (row._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    }));
  }

  async listPaidForReport(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<
    {
      supplierId: string;
      supplierName: string;
      categoryId: string;
      amount: string;
      paidAt: Date;
      paymentOrigin: PaymentOrigin;
    }[]
  > {
    const rows = await prisma.accountsPayable.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: "PAID",
        paidAt: { gte: from, lte: to },
      },
      select: {
        supplierId: true,
        categoryId: true,
        amount: true,
        paidAt: true,
        paymentOrigin: true,
        supplier: { select: { name: true } },
      },
    });

    return rows.map((row) => ({
      supplierId: row.supplierId,
      supplierName: row.supplier.name,
      categoryId: row.categoryId,
      amount: row.amount.toFixed(2),
      paidAt: row.paidAt as Date,
      paymentOrigin: row.paymentOrigin,
    }));
  }

  async listPendingForReminders(
    organizationId: string,
  ): Promise<AccountsPayable[]> {
    const rows = await prisma.accountsPayable.findMany({
      where: {
        organizationId,
        status: "PENDING",
        deletedAt: null,
        reminderEnabled: true,
      },
      include: USER_NAMES_INCLUDE,
      orderBy: { dueDate: "asc" },
    });
    return rows.map(toDomain);
  }

  async touchReminderSent(
    id: string,
    sentAt: Date,
    messageId: string | null,
  ): Promise<void> {
    await prisma.accountsPayable.update({
      where: { id },
      data: { lastReminderSentAt: sentAt, lastReminderMessageId: messageId },
    });
  }
}
