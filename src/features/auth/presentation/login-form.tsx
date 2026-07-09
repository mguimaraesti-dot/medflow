"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "../application/dtos/login.dto";
import { createSupabaseBrowserClient } from "@/core/auth/supabase-browser.client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function handleGoogleLogin() {
    setServerError(null);
    setIsGoogleLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (error) {
        setServerError("Não foi possível entrar com o Google.");
        setIsGoogleLoading(false);
      }
      // Em sucesso, o navegador é redirecionado para o Google — não há
      // mais nada a fazer aqui.
    } catch {
      setServerError("Não foi possível conectar. Tente novamente.");
      setIsGoogleLoading(false);
    }
  }

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const body = await response.json();

      if (!response.ok) {
        setServerError(body.error?.message ?? "Não foi possível entrar.");
        return;
      }

      router.push("/dashboard");
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Esqueceu a senha?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-destructive text-sm">{errors.password.message}</p>
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
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">ou</span>
        <Separator className="flex-1" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isGoogleLoading}
        onClick={handleGoogleLogin}
      >
        {isGoogleLoading ? "Conectando..." : "Entrar com Google"}
      </Button>
    </form>
  );
}
