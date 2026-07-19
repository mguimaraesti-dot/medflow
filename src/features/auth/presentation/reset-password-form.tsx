"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "../application/dtos/reset-password.dto";
import { createIsolatedSupabaseClient } from "@/core/auth/supabase-isolated.client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type SessionStatus = "checking" | "ready" | "invalid";

/**
 * Lê `access_token`/`refresh_token` direto do fragmento da URL
 * (`#access_token=...&refresh_token=...`) em vez de deixar o SDK do
 * Supabase detectar sozinho — ver o comentário de
 * `createIsolatedSupabaseClient` sobre o porquê de não usar o client
 * normal (`detectSessionInUrl`) aqui.
 */
function parseHashTokens(): {
  accessToken: string;
  refreshToken: string;
} | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/**
 * O link de convite/recuperação chega com o token de sessão no
 * fragmento da URL. Usávamos o client "normal" (`createSupabaseBrowserClient`),
 * que grava a sessão em cookies compartilhados por TODAS as abas do
 * mesmo navegador — bug real encontrado em produção: um admin já
 * logado, ao abrir (no mesmo navegador) o link de convite de outra
 * conta, tinha sua própria sessão contaminada pela sessão do link
 * (ou vice-versa), e a troca de senha às vezes não "pegava" pra
 * ninguém, sem erro visível. Agora a sessão do link é estabelecida
 * manualmente (`setSession`) num client ISOLADO, que nunca escreve em
 * cookies/localStorage — não interfere com nenhuma outra aba.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [supabase] = useState(() => createIsolatedSupabaseClient());
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    let cancelled = false;

    async function establishSession() {
      const tokens = parseHashTokens();
      if (!tokens) {
        if (!cancelled) setSessionStatus("invalid");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      if (cancelled) return;

      if (error) {
        setSessionStatus("invalid");
        return;
      }

      // Limpa o fragmento da URL — o token não precisa mais ficar
      // visível ali (evita reexposição em copiar/recarregar a página).
      window.history.replaceState(null, "", window.location.pathname);
      setSessionStatus("ready");
    }

    establishSession();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) {
        setServerError(
          "Não foi possível atualizar a senha. Solicite um novo link.",
        );
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setServerError("Não foi possível conectar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sessionStatus === "invalid") {
    return (
      <p className="text-destructive text-sm" role="alert">
        Este link expirou ou já foi usado. Solicite um novo convite ou clique em
        &quot;Esqueceu a senha?&quot; na tela de login.
      </p>
    );
  }

  const isChecking = sessionStatus === "checking";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {isChecking && (
        <p className="text-muted-foreground text-sm">
          Confirmando o link recebido...
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          disabled={isChecking}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-destructive text-sm">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          disabled={isChecking}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-destructive text-sm">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {serverError && (
        <p className="text-destructive text-sm" role="alert">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        className="from-primary to-brand-secondary w-full bg-gradient-to-b shadow-sm"
        disabled={isSubmitting || isChecking}
      >
        {isSubmitting ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
