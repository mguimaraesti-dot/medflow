import type { Prisma } from "@prisma/client";
import { toMoneyString } from "@/shared/lib/money";

export interface SafeResponseDTO {
  organizationId: string;
  balance: string;
}

export function toSafeResponseDTO(
  organizationId: string,
  balance: Prisma.Decimal,
): SafeResponseDTO {
  return {
    organizationId,
    balance: toMoneyString(balance) as string,
  };
}
