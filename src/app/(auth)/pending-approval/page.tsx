import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { getSessionUser } from "@/core/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { LogoBadge } from "@/shared/components/logo";
import { LogoutButton } from "@/features/auth/presentation/logout-button";

/**
 * Destino de quem acabou de ser criado (convite de Admin/Gerente ou
 * primeiro login via Google) e ainda não tem perfil atribuído — a
 * sessão do Supabase já existe, só não há permissão nenhuma ainda.
 */
export default async function PendingApprovalPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.status !== "PENDING") {
    redirect("/dashboard");
  }

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center">
          <LogoBadge className="mb-2" />
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <Clock className="h-6 w-6 text-amber-500" />
          </div>
          <CardTitle>Aguardando aprovação</CardTitle>
          <CardDescription>
            Olá, {user.name}. Seu cadastro foi criado, mas seu acesso ainda
            precisa ser liberado por um Gerente ou Administrador. Assim que um
            perfil for atribuído, você poderá entrar normalmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  );
}
