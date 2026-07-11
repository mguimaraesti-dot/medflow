import type { Prisma } from "@prisma/client";
import type { Safe } from "./safe.entity";

export interface SafeRepository {
  findByOrganization(organizationId: string): Promise<Safe | null>;

  /**
   * Saldo derivado da soma das movimentações — nunca lido de um campo
   * persistido (Coding Standards, item 18.1).
   */
  getBalance(organizationId: string): Promise<Prisma.Decimal>;

  /**
   * Mesma lógica de `getBalance()`, mas só até (exclusive) uma data —
   * usado no Status Report pra "saldo inicial do período" (saldo de
   * tudo que aconteceu antes do início do período selecionado).
   */
  getBalanceAsOf(organizationId: string, asOf: Date): Promise<Prisma.Decimal>;
}
