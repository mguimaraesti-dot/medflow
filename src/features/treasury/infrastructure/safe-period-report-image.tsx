import { ImageResponse } from "next/og";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";

export interface SafePeriodReportImageInput {
  organizationName: string;
  dateFrom: Date;
  dateTo: Date;
  openingBalance: string;
  closingBalance: string;
  totalIn: string;
  totalOut: string;
}

const NAVY = "#1B2233";
const BLUE = "#2563EB";
const GREEN = "#16A34A";
const RED = "#DC2626";
const SLATE = "#64748B";

/**
 * Imagem-resumo do Relatório de Cofre pro botão "Enviar por WhatsApp" —
 * gerada com `next/og` (satori: só flexbox/estilos inline, sem classes
 * Tailwind) e convertida pra base64 por quem chama
 * (`send-safe-period-report-whatsapp.use-case.ts`), nunca fica hospedada
 * publicamente.
 */
export async function renderSafePeriodReportImage(
  input: SafePeriodReportImageInput,
): Promise<ArrayBuffer> {
  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F8FAFC",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: NAVY,
          padding: "56px 64px",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#FFFFFF",
            fontSize: 42,
            fontWeight: 700,
          }}
        >
          {input.organizationName}
        </div>
        <div style={{ display: "flex", color: "#B8C2D8", fontSize: 26 }}>
          Relatório de Cofre
        </div>
        <div
          style={{
            display: "flex",
            color: "#94A3B8",
            fontSize: 22,
            marginTop: 8,
          }}
        >
          {formatDateOnlyBR(input.dateFrom)} a {formatDateOnlyBR(input.dateTo)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: 64,
          gap: 32,
        }}
      >
        <div style={{ display: "flex", gap: 32 }}>
          <ReportStat
            label="Saldo Inicial"
            value={input.openingBalance}
            color={SLATE}
          />
          <ReportStat
            label="Saldo Final"
            value={input.closingBalance}
            color={BLUE}
          />
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          <ReportStat
            label="Entradas"
            value={input.totalIn}
            color={GREEN}
            prefix="+"
          />
          <ReportStat
            label="Saídas"
            value={input.totalOut}
            color={RED}
            prefix="-"
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "24px 64px",
          borderTop: "1px solid #E2E8F0",
        }}
      >
        <div style={{ display: "flex", color: SLATE, fontSize: 18 }}>
          Gerado em {formatDateOnlyBR(new Date())}
        </div>
        <div
          style={{
            display: "flex",
            color: SLATE,
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          MedFlow
        </div>
      </div>
    </div>,
    { width: 1080, height: 1080 },
  );

  return image.arrayBuffer();
}

function ReportStat({
  label,
  value,
  color,
  prefix,
}: {
  label: string;
  value: string;
  color: string;
  prefix?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        border: "1px solid #E2E8F0",
        padding: "32px 36px",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", color: SLATE, fontSize: 24 }}>{label}</div>
      <div style={{ display: "flex", color, fontSize: 44, fontWeight: 700 }}>
        {prefix ?? ""}
        {formatCurrencyBRL(value)}
      </div>
    </div>
  );
}
