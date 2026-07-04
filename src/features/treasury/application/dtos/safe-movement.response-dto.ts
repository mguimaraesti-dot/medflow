import { toMoneyString } from "@/shared/lib/money";
import type { SafeMovement } from "../../domain/safe-movement.entity";

export interface SafeMovementResponseDTO {
  id: string;
  organizationId: string;
  safeId: string;
  type: SafeMovement["type"];
  amount: string;
  relatedCashRegisterDayId: string | null;
  performedByUserId: string;
  reason: string | null;
  createdAt: Date;
}

export function toSafeMovementResponseDTO(
  movement: SafeMovement,
): SafeMovementResponseDTO {
  return {
    id: movement.id,
    organizationId: movement.organizationId,
    safeId: movement.safeId,
    type: movement.type,
    amount: toMoneyString(movement.amount) as string,
    relatedCashRegisterDayId: movement.relatedCashRegisterDayId,
    performedByUserId: movement.performedByUserId,
    reason: movement.reason,
    createdAt: movement.createdAt,
  };
}
