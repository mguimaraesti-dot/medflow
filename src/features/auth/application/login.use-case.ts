import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/core/database/prisma.client";
import {
  InvalidCredentialsError,
  UserInactiveError,
} from "@/core/errors/domain-error";
import type { LoginInput } from "./dtos/login.dto";
import type { UserRepository } from "../domain/user.repository";

export interface LoginResult {
  userId: string;
  name: string;
  email: string;
  roleName: string;
}

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

interface LoginDeps {
  supabase: SupabaseClient;
  userRepository: UserRepository;
}

/**
 * US01 — Login. Critérios de aceite cobertos aqui:
 * - Credenciais inválidas não revelam se o e-mail existe.
 * - Toda tentativa (sucesso ou falha) gera AuditLog (ação LOGIN).
 * - Usuário desativado não consegue autenticar, mesmo com credenciais
 *   corretas — e a sessão que o Supabase Auth já tinha criado é
 *   revertida (signOut) para não deixar nada "meio autenticado".
 */
export async function loginUseCase(
  input: LoginInput,
  deps: LoginDeps,
  meta: RequestMeta = {},
): Promise<LoginResult> {
  const { data, error } = await deps.supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    await auditLoginAttempt({ entityId: input.email, success: false, meta });
    throw new InvalidCredentialsError();
  }

  const user = await deps.userRepository.findBySupabaseAuthId(data.user.id);

  if (!user || !user.active) {
    await deps.supabase.auth.signOut();
    await auditLoginAttempt({
      entityId: user?.id ?? data.user.id,
      success: false,
      meta,
    });
    throw new UserInactiveError();
  }

  await auditLoginAttempt({
    userId: user.id,
    entityId: user.id,
    success: true,
    meta,
  });

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    roleName: user.roleName,
  };
}

async function auditLoginAttempt(params: {
  userId?: string;
  entityId: string;
  success: boolean;
  meta: RequestMeta;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      entity: "User",
      entityId: params.entityId,
      action: "LOGIN",
      reason: params.success ? undefined : "Falha na tentativa de login",
      ipAddress: params.meta.ipAddress,
      userAgent: params.meta.userAgent,
    },
  });
}
