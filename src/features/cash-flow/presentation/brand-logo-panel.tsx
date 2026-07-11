import { LogoVertical } from "@/shared/components/logo";

/**
 * Preenche o espaço vertical que sobra abaixo do "Resumo do Dia" (o card
 * não estica pra acompanhar a coluna do formulário, de propósito — ver
 * daily-summary-panel.tsx). Usa o lockup vertical da marca MedFlow (SVG,
 * escala bem em qualquer tamanho) — a foto da logo da Clínica MAE ficava
 * ruim reduzida a um espaço estreito como esse.
 */
export function BrandLogoPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <LogoVertical />
    </div>
  );
}
