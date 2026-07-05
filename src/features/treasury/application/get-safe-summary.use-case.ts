import type { Prisma } from "@prisma/client";
import type { SafeRepository } from "../domain/safe.repository";

interface Deps {
  safeRepository: SafeRepository;
}

/** Saldo corrente do Cofre — passthrough pro repositório (saldo é sempre derivado, nunca persistido). */
export async function getSafeSummaryUseCase(
  organizationId: string,
  deps: Deps,
): Promise<Prisma.Decimal> {
  return deps.safeRepository.getBalance(organizationId);
}
