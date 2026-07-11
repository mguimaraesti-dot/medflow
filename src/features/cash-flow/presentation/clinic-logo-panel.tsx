import Image from "next/image";

/**
 * Preenche o espaço vertical que sobra abaixo do "Resumo do Dia" (o card
 * não estica pra acompanhar a coluna do formulário, de propósito — ver
 * daily-summary-panel.tsx). Mesmo arquivo de logo já usado no Status
 * Report/WhatsApp (public/logo-clinica-mae.jpg), só copiado pra public/
 * pra poder ser servido direto pro navegador.
 */
export function ClinicLogoPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
      <Image
        src="/logo-clinica-mae.jpg"
        alt="Clínica MAE"
        width={160}
        height={100}
        className="h-auto w-36 opacity-90"
      />
      <p className="text-muted-foreground text-center text-xs">
        Diagnóstico e Tratamento em Gastroenterologia
      </p>
    </div>
  );
}
