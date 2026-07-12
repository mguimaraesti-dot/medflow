import { LogoPrincipal } from "@/shared/components/logo";

/**
 * Card do logo empilhado sobre o "Resumo do Dia" (Refinamento de layout
 * v2 Caixa Recepção). Fundo branco explícito (não usa o `Card` do tema)
 * porque o Logo Principal é a variante "Colorida" do manual, desenhada
 * pra fundo claro — precisa continuar branco mesmo com o app em tema
 * escuro.
 */
export function BrandLogoPanel() {
  return (
    <div className="flex items-center rounded-2xl bg-white p-5 shadow-sm">
      <LogoPrincipal />
    </div>
  );
}
