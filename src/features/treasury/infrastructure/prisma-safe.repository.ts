import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import type { SafeRepository } from "../domain/safe.repository";
import type { Safe } from "../domain/safe.entity";

export class PrismaSafeRepository implements SafeRepository {
  async findByOrganization(organizationId: string): Promise<Safe | null> {
    return prisma.safe.findUnique({ where: { organizationId } });
  }

  /**
   * Saldo derivado: -SUM(FUNDING) + SUM(SANGRIA + CASH_REGISTER_HANDOFF)
   * + SUM(MANUAL_ADJUSTMENT) — os três primeiros tipos têm direção
   * implícita pelo próprio `type`; `MANUAL_ADJUSTMENT` carrega seu
   * próprio sinal (Coding Standards, item 18.1).
   */
  async getBalance(organizationId: string): Promise<Prisma.Decimal> {
    const safe = await prisma.safe.findUnique({ where: { organizationId } });
    if (!safe) return new Prisma.Decimal(0);

    const [funding, credits, manualAdjustment] = await Promise.all([
      prisma.safeMovement.aggregate({
        where: { safeId: safe.id, type: "FUNDING" },
        _sum: { amount: true },
      }),
      prisma.safeMovement.aggregate({
        where: {
          safeId: safe.id,
          type: { in: ["SANGRIA", "CASH_REGISTER_HANDOFF"] },
        },
        _sum: { amount: true },
      }),
      prisma.safeMovement.aggregate({
        where: { safeId: safe.id, type: "MANUAL_ADJUSTMENT" },
        _sum: { amount: true },
      }),
    ]);

    const fundingSum = funding._sum.amount ?? new Prisma.Decimal(0);
    const creditsSum = credits._sum.amount ?? new Prisma.Decimal(0);
    const adjustmentSum = manualAdjustment._sum.amount ?? new Prisma.Decimal(0);

    return creditsSum.plus(adjustmentSum).minus(fundingSum);
  }
}
