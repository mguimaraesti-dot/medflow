import { prisma } from "@/core/database/prisma.client";
import type { PaymentMethodRepository } from "../domain/payment-method.repository";
import type { PaymentMethod } from "../domain/payment-method.entity";

export class PrismaPaymentMethodRepository implements PaymentMethodRepository {
  async listActive(organizationId: string): Promise<PaymentMethod[]> {
    return prisma.paymentMethod.findMany({
      where: { organizationId, active: true },
      orderBy: { displayOrder: "asc" },
    });
  }
}
