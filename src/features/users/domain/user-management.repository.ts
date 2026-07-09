import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type { ManagedUser, ManagedUserStatus } from "./managed-user.entity";

export interface ListUsersFilter {
  organizationId: string;
  status?: ManagedUserStatus;
  roleId?: string;
  /** Busca livre por nome ou e-mail (contains, case-insensitive). */
  search?: string;
}

export interface FinalizeInviteInput {
  name: string;
  roleId: string;
  organizationId: string;
}

/**
 * `status` aqui só existe para a transição PENDING -> ACTIVE, que
 * acontece como efeito colateral de atribuir um perfil a alguém ainda
 * pendente (é assim que a Gestão de Acessos "aprova" um usuário criado
 * via convite/Google) — nunca usado para INACTIVE, isso é sempre via
 * `setStatus()`.
 */
export interface UpdateManagedUserInput {
  name?: string;
  roleId?: string;
  status?: Extract<ManagedUserStatus, "ACTIVE">;
}

export interface UserManagementRepository {
  list(
    filter: ListUsersFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<ManagedUser>>;

  findById(id: string): Promise<ManagedUser | null>;

  /**
   * Chamado logo após `supabaseAdmin.auth.admin.inviteUserByEmail()` —
   * o trigger `handle_new_auth_user` já criou a linha PENDING (sem
   * nome real nem perfil); aqui só a enriquece e ativa, localizando
   * pelo `supabaseAuthId` do usuário recém-convidado.
   */
  finalizeInvite(
    supabaseAuthId: string,
    data: FinalizeInviteInput,
  ): Promise<ManagedUser>;

  update(id: string, data: UpdateManagedUserInput): Promise<ManagedUser>;

  setStatus(
    id: string,
    status: Extract<ManagedUserStatus, "ACTIVE" | "INACTIVE">,
  ): Promise<ManagedUser>;

  /**
   * Quantos usuários ATIVOS têm perfil Administrador — usado para
   * bloquear desativar/trocar o perfil do último Admin ativo.
   * `excludingUserId` exclui o próprio usuário-alvo da contagem (pra
   * responder "sobra algum Admin além deste?").
   */
  countActiveAdmins(excludingUserId?: string): Promise<number>;
}
