import { Logo } from "@/shared/components/logo";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * Card compacto com a marca MedFlow, encostado ao lado do Saldo Atual
 * (mesma linha, mesma altura) — Refinamento de layout Caixa Recepção.
 * `shrink-0` porque quem deve ocupar a largura disponível é o card de
 * Saldo Atual, não este. Mantém a tagline da marca embaixo do lockup.
 */
export function BrandLogoPanel() {
  return (
    <Card className="flex shrink-0 items-center rounded-2xl shadow-sm">
      <CardContent className="flex flex-col items-center gap-1 p-6">
        <Logo />
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          Gestão financeira inteligente para clínicas
        </span>
      </CardContent>
    </Card>
  );
}
