import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { LogoBadge } from "@/shared/components/logo";
import { ForgotPasswordForm } from "@/features/auth/presentation/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center">
          <LogoBadge className="mb-2" />
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>
            Informe seu e-mail para receber um link de redefinição de senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
