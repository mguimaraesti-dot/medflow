import { toMoneyString } from "@/shared/lib/money";
import type { SafeMovement } from "../../domain/safe-movement.entity";

export interface SafeMovementResponseDTO {
  id: string;
  organizationId: string;
  safeId: string;
  type: SafeMovement["type"];
  amount: string;
  status: SafeMovement["status"];
  relatedCashRegisterDayId: string | null;
  performedByUserId: string;
  performedByUserName: string;
  reason: string | null;
  confirmedByUserId: string | null;
  confirmedByUserName: string | null;
  confirmedAt: Date | null;
  cancelledByUserId: string | null;
  cancelledByUserName: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  categoryName: string | null;
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
    status: movement.status,
    relatedCashRegisterDayId: movement.relatedCashRegisterDayId,
    performedByUserId: movement.performedByUserId,
    performedByUserName: movement.performedByUserName,
    reason: movement.reason,
    confirmedByUserId: movement.confirmedByUserId,
    confirmedByUserName: movement.confirmedByUserName,
    confirmedAt: movement.confirmedAt,
    cancelledByUserId: movement.cancelledByUserId,
    cancelledByUserName: movement.cancelledByUserName,
    cancelledAt: movement.cancelledAt,
    cancelReason: movement.cancelReason,
    categoryName: movement.categoryName,
    createdAt: movement.createdAt,
  };
}
