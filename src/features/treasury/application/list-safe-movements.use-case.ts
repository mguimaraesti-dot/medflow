import type { PaginatedResult } from "@/shared/lib/pagination";
import type { SafeMovementRepository } from "../domain/safe-movement.repository";
import type { SafeMovement } from "../domain/safe-movement.entity";
import type { ListSafeMovementsInput } from "./dtos/list-safe-movements.dto";

interface Deps {
  safeMovementRepository: SafeMovementRepository;
}

export async function listSafeMovementsUseCase(
  input: ListSafeMovementsInput,
  organizationId: string,
  deps: Deps,
): Promise<PaginatedResult<SafeMovement>> {
  return deps.safeMovementRepository.list(
    {
      organizationId,
      type: input.type,
      createdAtFrom: input.createdAtFrom,
      createdAtTo: input.createdAtTo,
    },
    { page: input.page, pageSize: input.pageSize },
  );
}
