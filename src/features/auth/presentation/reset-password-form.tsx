"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "../application/dtos/reset-password.dto";
import { createSupabaseBrowserClient } from "@/core/auth/supabase-browser.client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type SessionStatus = "checking" | "ready" | "invalid";

/**
 * O link de convite/recuperação chega com o token de sessão no
 * FRAGMENTO da URL (`#access_token=...`), processado de forma
 * assíncrona pelo SDK do Supabase — não dá pra assumir que a sessão já
 * está pronta assim que o componente monta. Antes, `onSubmit` criava o
 * client e chamava `updateUser` de uma vez só; se a sessão ainda não
 * tivesse sido estabelecida nesse instante, a troca de senha podia
 * rodar sem sessão válida, sem nenhum erro visível na tela (bug real
 * encontrado em produção — usuário "definia" a senha, mas ela nunca
 * era gravada). Aqui a sessão é confirmada (via `getSession` +
 * `onAuthStateChange`) antes de liberar o formulário, com um limite de
 * tempo pra avisar claramente se o link expirou ou já foi usado.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) {
        setSessionStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        setSessionStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setSessionStatus((current) =>
          current === "ready" ? current : "invalid",
        );
      }
    }, 5000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
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
      await supabase.auth.signOut();
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
