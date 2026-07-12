import { ImageResponse } from "next/og";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import type { StatusReportSummary } from "../domain/status-report.entity";
import {
  BLUE,
  GREEN,
  RED,
  LIGHT_GRAY,
  DARK_TEXT,
  MUTED_TEXT,
  BORDER,
  GREEN_BG,
  Icon,
  ICON_PATHS,
  MedFlowIcon,
  loadOrganizationLogoDataUri,
} from "./report-image-kit";

function KpiCard({
  label,
  value,
  color,
  iconPath,
  highlighted,
}: {
  label: string;
  value: string;
  color: string;
  iconPath: string;
  highlighted?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        flex: 1,
        position: "relative",
        backgroundColor: highlighted ? GREEN_BG : "#FFFFFF",
        border: `1px solid ${highlighted ? GREEN : BORDER}`,
        borderRadius: 16,
        padding: "32px 12px",
      }}
    >
      {highlighted && (
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -16,
            right: 8,
            backgroundColor: GREEN,
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 700,
            padding: "5px 12px",
            borderRadius: 999,
          }}
        >
          RESULTADO DO PERÍODO
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: 999,
          backgroundColor: `${color}1A`,
        }}
      >
        <Icon path={iconPath} color={color} size={26} />
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 18,
          fontWeight: 700,
          color: MUTED_TEXT,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: highlighted ? 40 : 33,
          fontWeight: 800,
          color,
        }}
      >
        {formatCurrencyBRL(value)}
      </div>
    </div>
  );
}

function CategoryRow({
  iconPath,
  label,
  income,
  expense,
  isTotal,
}: {
  iconPath: string;
  label: string;
  income: string | null;
  expense: string | null;
  isTotal?: boolean;
}) {
  const balance =
    income !== null || expense !== null
      ? (Number(income ?? 0) - Number(expense ?? 0)).toFixed(2)
      : null;
  const balanceColor = balance !== null && Number(balance) < 0 ? RED : GREEN;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "24px 32px",
        borderTop: isTotal ? `2px solid ${DARK_TEXT}` : `1px solid ${BORDER}`,
        backgroundColor: isTotal ? LIGHT_GRAY : "#FFFFFF",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flex: 2,
          minWidth: 0,
        }}
      >
        {!isTotal && <Icon path={iconPath} color={MUTED_TEXT} size={24} />}
        <div
          style={{
            display: "flex",
            fontSize: 27,
            fontWeight: isTotal ? 800 : 600,
            color: DARK_TEXT,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1.2,
          justifyContent: "flex-end",
          fontSize: 24,
          fontWeight: isTotal ? 800 : 600,
          color: income !== null ? GREEN : MUTED_TEXT,
        }}
      >
        {income !== null ? formatCurrencyBRL(income) : "–"}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1.2,
          justifyContent: "flex-end",
          fontSize: 24,
          fontWeight: isTotal ? 800 : 600,
          color: expense !== null ? RED : MUTED_TEXT,
        }}
      >
        {expense !== null ? formatCurrencyBRL(expense) : "–"}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1.2,
          justifyContent: "flex-end",
          fontSize: 24,
          fontWeight: 800,
          color: balance !== null ? balanceColor : MUTED_TEXT,
        }}
      >
        {balance !== null ? formatCurrencyBRL(balance) : "–"}
      </div>
    </div>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  RECEPCAO: ICON_PATHS.user,
  CONVENIOS: ICON_PATHS.shield,
  PARTICULAR: ICON_PATHS.user,
  CONTAS_A_PAGAR: ICON_PATHS.receipt,
  DESPESAS_OPERACIONAIS: ICON_PATHS.zap,
  SALARIOS: ICON_PATHS.users,
  AJUSTES: ICON_PATHS.sliders,
};

/**
 * Renderiza o Status Report como imagem 1080x1920 (`next/og`/satori) —
 * layout fixo seguindo a especificação visual aprovada. Sem fonte
 * Poppins embutida (satori cairia pra fallback silencioso sem o
 * arquivo de fonte); usa a sans-serif padrão do satori, mantendo
 * pesos/tamanhos análogos. Fontes deliberadamente grandes (a imagem é
 * feita pra ser vista em tela de celular, não em monitor).
 */
export async function renderStatusReportImage(
  input: StatusReportSummary,
): Promise<ArrayBuffer> {
  const superavit = Number(input.closingBalance) - Number(input.openingBalance);
  const isSuperavit = superavit >= 0;
  const logoDataUri = loadOrganizationLogoDataUri();

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        fontFamily: "sans-serif",
        color: DARK_TEXT,
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "48px 56px 28px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDataUri}
          width={176}
          height={110}
          alt={input.organizationName}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 800,
              color: BLUE,
            }}
          >
            STATUS REPORT
          </div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED_TEXT }}>
            Relatório Financeiro do Período
          </div>
        </div>
      </div>

      {/* Informações do período */}
      <div style={{ display: "flex", padding: "0 56px 28px" }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            backgroundColor: "#F8FAFC",
            borderRadius: 16,
            padding: "30px 32px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Icon path={ICON_PATHS.calendar} color={BLUE} size={26} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 18, color: MUTED_TEXT }}>
                Período
              </div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
                {formatDateOnlyBR(input.dateFrom)} a{" "}
                {formatDateOnlyBR(input.dateTo)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Icon path={ICON_PATHS.clock} color={BLUE} size={26} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 18, color: MUTED_TEXT }}>
                Emitido em
              </div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
                {formatDateOnlyBR(input.generatedAt)} às{" "}
                {String(input.generatedAt.getUTCHours()).padStart(2, "0")}:
                {String(input.generatedAt.getUTCMinutes()).padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores principais */}
      <div style={{ display: "flex", gap: 20, padding: "8px 56px 36px" }}>
        <KpiCard
          label="SALDO INICIAL"
          value={input.openingBalance}
          color={BLUE}
          iconPath={ICON_PATHS.wallet}
        />
        <KpiCard
          label="ENTRADAS"
          value={input.totalIn}
          color={GREEN}
          iconPath={ICON_PATHS.arrowDown}
        />
        <KpiCard
          label="SAÍDAS"
          value={input.totalOut}
          color={RED}
          iconPath={ICON_PATHS.arrowUp}
        />
        <KpiCard
          label="SALDO FINAL"
          value={input.closingBalance}
          color={GREEN}
          iconPath={ICON_PATHS.wallet}
          highlighted
        />
      </div>

      {/* Resumo por categoria */}
      <div
        style={{ display: "flex", flexDirection: "column", padding: "0 56px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <Icon path={ICON_PATHS.barChart} color={DARK_TEXT} size={30} />
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>
            RESUMO POR CATEGORIA
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: "#F8FAFC",
              padding: "16px 32px",
            }}
          >
            <div
              style={{
                display: "flex",
                flex: 2,
                fontSize: 18,
                fontWeight: 700,
                color: MUTED_TEXT,
              }}
            >
              CATEGORIA
            </div>
            <div
              style={{
                display: "flex",
                flex: 1.2,
                justifyContent: "flex-end",
                fontSize: 18,
                fontWeight: 700,
                color: MUTED_TEXT,
              }}
            >
              ENTRADAS
            </div>
            <div
              style={{
                display: "flex",
                flex: 1.2,
                justifyContent: "flex-end",
                fontSize: 18,
                fontWeight: 700,
                color: MUTED_TEXT,
              }}
            >
              SAÍDAS
            </div>
            <div
              style={{
                display: "flex",
                flex: 1.2,
                justifyContent: "flex-end",
                fontSize: 18,
                fontWeight: 700,
                color: MUTED_TEXT,
              }}
            >
              SALDO
            </div>
          </div>
          {input.categories.map((category) => (
            <CategoryRow
              key={category.code}
              iconPath={CATEGORY_ICONS[category.code]}
              label={category.label}
              income={category.income}
              expense={category.expense}
            />
          ))}
          <CategoryRow
            iconPath=""
            label="TOTAL"
            income={sumColumn(input.categories, "income")}
            expense={sumColumn(input.categories, "expense")}
            isTotal
          />
        </div>
      </div>

      {/* Card de resultado final */}
      <div style={{ display: "flex", padding: "32px 56px 0" }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: GREEN_BG,
            border: `1px solid ${GREEN}`,
            borderRadius: 16,
            padding: "36px 40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 999,
                backgroundColor: `${GREEN}26`,
              }}
            >
              <Icon
                path={
                  isSuperavit ? ICON_PATHS.trendingUp : ICON_PATHS.trendingDown
                }
                color={GREEN}
                size={38}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  color: MUTED_TEXT,
                }}
              >
                SALDO FINAL DO PERÍODO
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 46,
                  fontWeight: 800,
                  color: GREEN,
                }}
              >
                {formatCurrencyBRL(input.closingBalance)}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <div style={{ display: "flex", fontSize: 20, color: MUTED_TEXT }}>
              {isSuperavit ? "Superávit de" : "Déficit de"}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 32,
                fontWeight: 800,
                color: isSuperavit ? GREEN : RED,
              }}
            >
              {formatCurrencyBRL(Math.abs(superavit).toFixed(2))}
            </div>
            <div style={{ display: "flex", fontSize: 18, color: MUTED_TEXT }}>
              em relação ao saldo inicial.
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé — sem flex:1/justify-end: com as fontes maiores o
            conteúdo já ocupa quase toda a tela, então o rodapé só
            precisa vir logo em seguida, não ser empurrado pro fundo. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 56px 40px",
          borderTop: `1px solid ${BORDER}`,
          marginTop: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            fontSize: 20,
            color: MUTED_TEXT,
          }}
        >
          <span>Relatório gerado pelo</span>
          <span style={{ color: BLUE, fontWeight: 700 }}>MedFlow</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MedFlowIcon />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 800 }}>
              MedFlow
            </div>
            <div style={{ display: "flex", fontSize: 16, color: MUTED_TEXT }}>
              Gestão financeira inteligente para clínicas
            </div>
          </div>
        </div>
      </div>
    </div>,
    { width: 1080, height: 1920 },
  );

  return image.arrayBuffer();
}

function sumColumn(
  categories: StatusReportSummary["categories"],
  column: "income" | "expense",
): string {
  return categories
    .reduce((total, category) => total + Number(category[column] ?? 0), 0)
    .toFixed(2);
}
