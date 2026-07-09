"use client";

import { useState } from "react";
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

/**
 * Chegada aqui só acontece com uma sessão de recuperação válida (o link
 * de e-mail do Supabase já autentica o navegador antes de renderizar
 * esta página) — por isso `updateUser` funciona sem pedir a senha
 * antiga.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
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
        disabled={isSubmitting}
      >
        {isSubmitting ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
