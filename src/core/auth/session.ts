import { createSupabaseServerClient } from "./supabase-server.client";
import { prisma } from "@/core/database/prisma.client";

export interface SessionUser {
  id: string;
  organizationId: string | null;
  name: string;
  email: string;
  roleName: string;
  permissions: string[];
}

/**
 * Retorna o usuário autenticado (com role e permissões resolvidas) ou
 * `null` se não houver sessão válida — nunca lança erro, quem chama
 * decide o que fazer com `null` (redirecionar, lançar UnauthenticatedError
 * via rbac.middleware, etc.).
 *
 * Nota de arquitetura: esta função consulta o Prisma diretamente, sem
 * passar por um repository. É uma leitura de infraestrutura pura
 * (resolver "quem é o usuário desta requisição"), usada por praticamente
 * toda rota — diferente do `UserRepository` em `features/auth/domain`,
 * que existe para a lógica de negócio do login ser testável com mock.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    include: { role: { include: { permissions: true } } },
  });

  if (!user || !user.active) return null;

  return {
    id: user.id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    roleName: user.role.name,
    permissions: user.role.permissions.map((p) => p.key),
  };
}
