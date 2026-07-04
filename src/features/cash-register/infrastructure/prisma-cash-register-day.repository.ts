import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import type {
  CashRegisterDayRepository,
  CreateCashRegisterDayInput,
  CloseCashRegisterDayInput,
  ConfirmHandoffInput,
  RejectConferenceInput,
  ReopenCashRegisterDayInput,
} from "../domain/cash-register-day.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";

export class PrismaCashRegisterDayRepository implements CashRegisterDayRepository {
  async findById(id: string): Promise<CashRegisterDay | null> {
    return prisma.cashRegisterDay.findUnique({ where: { id } });
  }

  async findByOrganizationAndDate(
    organizationId: string,
    date: Date,
  ): Promise<CashRegisterDay | null> {
    return prisma.cashRegisterDay.findUnique({
      where: { organizationId_date: { organizationId, date } },
    });
  }

  async findLastClosed(
    organizationId: string,
  ): Promise<CashRegisterDay | null> {
    return prisma.cashRegisterDay.findFirst({
      where: { organizationId, status: "CLOSED" },
      orderBy: { date: "desc" },
    });
  }

  async findOpenByOrganization(
    organizationId: string,
  ): Promise<CashRegisterDay | null> {
    return prisma.cashRegisterDay.findFirst({
      where: { organizationId, status: "OPEN" },
      orderBy: { date: "desc" },
    });
  }

  async findPendingConferenceByOrganization(
    organizationId: string,
  ): Promise<CashRegisterDay | null> {
    return prisma.cashRegisterDay.findFirst({
      where: { organizationId, status: "PENDING_CONFERENCE" },
      orderBy: { date: "desc" },
    });
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

      return cashRegisterDay;
    });
  }

  async close(
    id: string,
    data: CloseCashRegisterDayInput,
  ): Promise<CashRegisterDay> {
    return prisma.cashRegisterDay.update({
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
    });
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

      return tx.cashRegisterDay.update({
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
      });
    });
  }

  async rejectConference(
    id: string,
    data: RejectConferenceInput,
  ): Promise<CashRegisterDay> {
    return prisma.cashRegisterDay.update({
      where: { id },
      data: {
        status: "OPEN",
        rejectedAt: new Date(),
        rejectionReason: data.reason,
      },
    });
  }

  async reopen(
    id: string,
    data: ReopenCashRegisterDayInput,
  ): Promise<CashRegisterDay> {
    return prisma.cashRegisterDay.update({
      where: { id },
      data: {
        status: "OPEN",
        reopenedByUserId: data.reopenedByUserId,
        reopenedAt: new Date(),
        reopenCount: { increment: 1 },
      },
    });
  }
}
