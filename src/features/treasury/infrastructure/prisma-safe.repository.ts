import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import type { SafeRepository } from "../domain/safe.repository";
import type { Safe } from "../domain/safe.entity";

export class PrismaSafeRepository implements SafeRepository {
  async findByOrganization(organizationId: string): Promise<Safe | null> {
    return prisma.safe.findUnique({ where: { organizationId } });
  }

  /**
   * Saldo derivado: -SUM(FUNDING + ACCOUNTS_PAYABLE_PAYMENT) +
   * SUM(SANGRIA + CASH_REGISTER_HANDOFF) + SUM(MANUAL_ADJUSTMENT) —
   * `ACCOUNTS_PAYABLE_PAYMENT` (pagamento de conta com dinheiro do Cofre)
   * tem a mesma direção de saída que `FUNDING`; os demais tipos têm
   * direção implícita pelo próprio `type`; `MANUAL_ADJUSTMENT` carrega seu
   * próprio sinal (Coding Standards, item 18.1). Só conta `status:
   * CONFIRMED` — um `CASH_REGISTER_HANDOFF` `PENDING` (fechamento de
   * caixa aguardando conferência do Gerente) não entra na soma até ser
   * confirmado.
   */
  async getBalance(organizationId: string): Promise<Prisma.Decimal> {
    const safe = await prisma.safe.findUnique({ where: { organizationId } });
    if (!safe) return new Prisma.Decimal(0);

    const [funding, credits, manualAdjustment] = await Promise.all([
      prisma.safeMovement.aggregate({
        where: {
          safeId: safe.id,
          status: "CONFIRMED",
          type: { in: ["FUNDING", "ACCOUNTS_PAYABLE_PAYMENT"] },
        },
        _sum: { amount: true },
      }),
      prisma.safeMovement.aggregate({
        where: {
          safeId: safe.id,
          status: "CONFIRMED",
          type: { in: ["SANGRIA", "CASH_REGISTER_HANDOFF"] },
        },
        _sum: { amount: true },
      }),
      prisma.safeMovement.aggregate({
        where: {
          safeId: safe.id,
          status: "CONFIRMED",
          type: "MANUAL_ADJUSTMENT",
        },
        _sum: { amount: true },
      }),
    ]);

    const fundingSum = funding._sum.amount ?? new Prisma.Decimal(0);
    const creditsSum = credits._sum.amount ?? new Prisma.Decimal(0);
    const adjustmentSum = manualAdjustment._sum.amount ?? new Prisma.Decimal(0);

    return creditsSum.plus(adjustmentSum).minus(fundingSum);
  }

  /** Igual a `getBalance()`, só acrescenta `createdAt: { lt: asOf }` em cada agregação. */
  async getBalanceAsOf(
    organizationId: string,
    asOf: Date,
  ): Promise<Prisma.Decimal> {
    const safe = await prisma.safe.findUnique({ where: { organizationId } });
    if (!safe) return new Prisma.Decimal(0);

    const dateFilter = { createdAt: { lt: asOf } };

    const [funding, credits, manualAdjustment] = await Promise.all([
      prisma.safeMovement.aggregate({
        where: {
          safeId: safe.id,
          status: "CONFIRMED",
          type: { in: ["FUNDING", "ACCOUNTS_PAYABLE_PAYMENT"] },
          ...dateFilter,
        },
        _sum: { amount: true },
      }),
      prisma.safeMovement.aggregate({
        where: {
          safeId: safe.id,
          status: "CONFIRMED",
          type: { in: ["SANGRIA", "CASH_REGISTER_HANDOFF"] },
          ...dateFilter,
        },
        _sum: { amount: true },
      }),
      prisma.safeMovement.aggregate({
        where: {
          safeId: safe.id,
          status: "CONFIRMED",
          type: "MANUAL_ADJUSTMENT",
          ...dateFilter,
        },
        _sum: { amount: true },
      }),
    ]);

    const fundingSumAsOf = funding._sum.amount ?? new Prisma.Decimal(0);
    const creditsSumAsOf = credits._sum.amount ?? new Prisma.Decimal(0);
    const adjustmentSumAsOf =
      manualAdjustment._sum.amount ?? new Prisma.Decimal(0);

    return creditsSumAsOf.plus(adjustmentSumAsOf).minus(fundingSumAsOf);
  }
}
