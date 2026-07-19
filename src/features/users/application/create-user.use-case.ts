import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  NotFoundError,
  UserEmailAlreadyExistsError,
} from "@/core/errors/domain-error";
import type { UserManagementRepository } from "../domain/user-management.repository";
import type { ManagedUser } from "../domain/managed-user.entity";
import type { CreateUserInput } from "./dtos/create-user.dto";

interface Deps {
  userManagementRepository: UserManagementRepository;
  supabaseAdmin: SupabaseClient;
  /**
   * Origem da requisição (ex.: `https://medflow-finance.vercel.app`),
   * extraída da própria request (mesmo padrão de `/api/auth/callback`)
   * — nunca hardcoded, nunca uma env var nova. Usada só para montar o
   * `redirectTo` abaixo.
   */
  appOrigin: string;
}

/**
 * Convida um usuário novo (Supabase Auth envia o e-mail com o link
 * pra ele definir a própria senha). O trigger `handle_new_auth_user`
 * já cria a linha PENDING em `users` assim que o convite é emitido —
 * aqui só enriquecemos essa linha (nome/perfil) e a ativamos.
 *
 * `redirectTo` explícito para `/reset-password` — sem isso, o Supabase
 * usa o "Site URL" configurado no painel como destino do link, que
 * pode apontar (ou ser alterado) para qualquer lugar; já vimos isso
 * quebrar em produção (link caindo em `/login`, sem tela pra definir
 * senha, usuário preso em loop). `/reset-password` já sabe processar
 * esse tipo de link — ver `reset-password-form.tsx`.
 */
export async function createUserUseCase(
  input: CreateUserInput,
  createdByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<ManagedUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new UserEmailAlreadyExistsError(input.email);
  }

  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role) {
    throw new NotFoundError("Perfil", input.roleId);
  }

  const { data, error } = await deps.supabaseAdmin.auth.admin.inviteUserByEmail(
    input.email,
    { redirectTo: `${deps.appOrigin}/reset-password` },
  );

  if (error || !data.user) {
    throw new Error(
      `Falha ao convidar usuário no Supabase Auth: ${error?.message}`,
    );
  }

  const user = await deps.userManagementRepository.finalizeInvite(
    data.user.id,
    { name: input.name, roleId: input.roleId, organizationId },
  );

  await prisma.auditLog.create({
    data: {
      userId: createdByUserId,
      entity: "User",
      entityId: user.id,
      action: "CREATE",
      after: { name: user.name, email: user.email, roleName: role.name },
    },
  });

  logger.info("Usuário convidado", {
    organizationId,
    userId: user.id,
    roleName: role.name,
  });

  return user;
}
