"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "../application/dtos/forgot-password.dto";
import { createSupabaseBrowserClient } from "@/core/auth/supabase-browser.client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (error) {
        setServerError("Não foi possível enviar o e-mail. Tente novamente.");
        return;
      }
      // Mensagem genérica independente do resultado real — não revela
      // se o e-mail existe (mesmo princípio já usado no login).
      setSent(true);
    } catch {
      setServerError("Não foi possível conectar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">
          Se este e-mail estiver cadastrado, você vai receber um link para
          redefinir sua senha.
        </p>
        <Link href="/login" className="text-primary text-sm hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-destructive text-sm">{errors.email.message}</p>
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
        {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
      </Button>

      <Link
        href="/login"
        className="text-muted-foreground block text-center text-sm hover:underline"
      >
        Voltar para o login
      </Link>
    </form>
  );
}
