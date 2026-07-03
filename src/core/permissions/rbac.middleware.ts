import {
  ForbiddenError,
  UnauthenticatedError,
} from "@/core/errors/domain-error";
import { getSessionUser, type SessionUser } from "@/core/auth/session";
import type { PermissionKey } from "./roles-permissions";

/**
 * Garante que existe uma sessão válida. Uso em toda rota autenticada,
 * mesmo quando não há uma permissão específica a checar (ex: GET de
 * dashboard, que qualquer perfil logado pode ver).
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

/**
 * Garante sessão válida + a permissão exigida. Lança DomainError em vez
 * de retornar um booleano — assim toda API Route usa o mesmo padrão
 * try/catch + handleApiError, sem precisar checar um retorno manualmente
 * em cada rota.
 */
export async function requirePermission(
  permission: PermissionKey,
): Promise<SessionUser> {
  const user = await requireAuth();

  if (!user.permissions.includes(permission)) {
    throw new ForbiddenError(permission);
  }

  return user;
}
