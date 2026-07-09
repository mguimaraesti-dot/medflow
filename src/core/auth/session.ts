import { cache } from "react";
import { createSupabaseServerClient } from "./supabase-server.client";
import { prisma } from "@/core/database/prisma.client";

export interface SessionUser {
  id: string;
  organizationId: string | null;
  name: string;
  email: string;
  /** `null` enquanto o usuário está PENDING (ainda sem perfil atribuído). */
  roleName: string | null;
  permissions: string[];
  status: "ACTIVE" | "INACTIVE" | "PENDING";
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
 *
 * Envolvida em `React.cache()`: todo layout.tsx chama isto e todo
 * page.tsx chama de novo — sem isso, cada navegação fazia 2x a
 * verificação do token contra o servidor do Supabase (auth.getUser(), um
 * round-trip de rede de verdade, não uma leitura local) e 2x a mesma
 * query com joins de role/permissões. `cache()` deduplica por request:
 * a 2ª chamada dentro do mesmo render reaproveita a mesma Promise.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    include: { role: { include: { permissions: true } } },
  });

  // INACTIVE é tratado como "sem sessão" (mesmo comportamento de
  // sempre). PENDING é uma sessão válida, só sem permissão nenhuma —
  // quem chama decide redirecionar para a tela de aguardando aprovação.
  if (!user || user.status === "INACTIVE") return null;

  return {
    id: user.id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    roleName: user.role?.name ?? null,
    permissions: user.role?.permissions.map((p) => p.key) ?? [],
    status: user.status,
  };
});
