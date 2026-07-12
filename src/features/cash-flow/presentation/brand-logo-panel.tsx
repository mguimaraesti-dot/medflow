import { LogoPrincipal } from "@/shared/components/logo";
import { Card, CardContent } from "@/shared/ui/card";

/**
 * Card do logo empilhado sobre o "Resumo do Dia" (Refinamento de layout
 * v2 Caixa Recepção). Usa o `Card` do tema (branco no claro, escuro no
 * escuro) em vez de fundo fixo — acompanha o tema como os outros
 * painéis da tela.
 */
export function BrandLogoPanel() {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="flex items-center p-5">
        <LogoPrincipal />
      </CardContent>
    </Card>
  );
}
