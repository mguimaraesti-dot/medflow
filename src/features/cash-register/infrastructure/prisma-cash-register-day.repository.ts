import { prisma } from "@/core/database/prisma.client";
import type {
  CashRegisterDayRepository,
  CreateCashRegisterDayInput,
  CloseCashRegisterDayInput,
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

  async create(data: CreateCashRegisterDayInput): Promise<CashRegisterDay> {
    return prisma.cashRegisterDay.create({
      data: {
        organizationId: data.organizationId,
        date: data.date,
        openingBalance: data.openingBalance,
        openedByUserId: data.openedByUserId,
      },
    });
  }

  async close(
    id: string,
    data: CloseCashRegisterDayInput,
  ): Promise<CashRegisterDay> {
    return prisma.cashRegisterDay.update({
      where: { id },
      data: {
        status: "CLOSED",
        totalIn: data.totalIn,
        totalOut: data.totalOut,
        closingBalance: data.closingBalance,
        closedByUserId: data.closedByUserId,
        closedAt: new Date(),
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
