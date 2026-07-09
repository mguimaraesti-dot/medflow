import type { PaginatedResult } from "@/shared/lib/pagination";
import type { UserManagementRepository } from "../domain/user-management.repository";
import type { ManagedUser } from "../domain/managed-user.entity";
import type { ListUsersInput } from "./dtos/list-users.dto";

interface Deps {
  userManagementRepository: UserManagementRepository;
}

export async function listUsersUseCase(
  input: ListUsersInput,
  organizationId: string,
  deps: Deps,
): Promise<PaginatedResult<ManagedUser>> {
  return deps.userManagementRepository.list(
    {
      organizationId,
      status: input.status,
      roleId: input.roleId,
      search: input.search,
    },
    { page: input.page, pageSize: input.pageSize },
  );
}
