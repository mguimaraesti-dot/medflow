import type { Prisma } from "@prisma/client";
import type { Safe } from "./safe.entity";

export interface SafeRepository {
  findByOrganization(organizationId: string): Promise<Safe | null>;

  /**
   * Saldo derivado da soma das movimentações — nunca lido de um campo
   * persistido (Coding Standards, item 18.1).
   */
  getBalance(organizationId: string): Promise<Prisma.Decimal>;
}
