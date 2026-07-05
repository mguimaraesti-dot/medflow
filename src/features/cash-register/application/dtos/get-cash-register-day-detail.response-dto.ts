import { toMoneyString } from "@/shared/lib/money";
import {
  toCashRegisterDayResponseDTO,
  type CashRegisterDayResponseDTO,
} from "./cash-register-day.response-dto";
import { toSafeMovementResponseDTO } from "@/features/treasury/application/dtos/safe-movement.response-dto";
import type { SafeMovementResponseDTO } from "@/features/treasury/application/dtos/safe-movement.response-dto";
import type { CashRegisterDayDetail } from "../get-cash-register-day-detail.use-case";

export interface CashRegisterDayEntryResponseDTO {
  type: "IN" | "OUT";
  amount: string;
  occurredAt: Date;
  categoryId: string;
}

export interface CashRegisterDayDetailResponseDTO {
  day: CashRegisterDayResponseDTO;
  entries: CashRegisterDayEntryResponseDTO[];
  safeMovements: SafeMovementResponseDTO[];
}

export function toCashRegisterDayDetailResponseDTO(
  detail: CashRegisterDayDetail,
): CashRegisterDayDetailResponseDTO {
  return {
    day: toCashRegisterDayResponseDTO(detail.day),
    entries: detail.entries.map((entry) => ({
      type: entry.type,
      amount: toMoneyString(entry.amount) as string,
      occurredAt: entry.occurredAt,
      categoryId: entry.categoryId,
    })),
    safeMovements: detail.safeMovements.map((movement) =>
      toSafeMovementResponseDTO(movement),
    ),
  };
}
