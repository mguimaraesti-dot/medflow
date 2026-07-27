"use client";

import Link from "next/link";
import {
  FileText,
  Landmark,
  LayoutDashboard,
  Receipt,
  Vault,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";

interface ReportCatalogItem {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** true para link externo (`<a target="_blank">`), ausente/false navega
   * pelo router do Next (`<Link>`) — ver `RELATORIO_EXAMES_URL` abaixo. */
  external?: boolean;
}

// Sistema de Relatório de Exames (ZSCAN) — aplicação separada do MedFlow,
// mesma conta de login (Supabase Auth compartilhado). Lida direto de
// `process.env` (não de `core/utils/env.ts`) porque este é um Client
// Component: aquele módulo também valida segredos server-only e quebraria
// o bundle do client. Opcional de propósito — sem a variável configurada,
// o card some da vitrine em vez de virar um link quebrado.
const RELATORIO_EXAMES_URL = process.env.NEXT_PUBLIC_RELATORIO_EXAMES_URL;

/** Vitrine de relatórios (cards clicáveis), pronta pra crescer sem precisar reestruturar quando novos relatórios chegarem. */
const REPORTS: ReportCatalogItem[] = [
  ...(RELATORIO_EXAMES_URL
    ? [
        {
          href: RELATORIO_EXAMES_URL,
          title: "Sumário Executivo",
          description:
            "Painel de exames da clínica — volume, parceiros e sinais de encaminhamento, em outro sistema.",
          icon: LayoutDashboard,
          external: true,
        },
      ]
    : []),
  {
    href: "/reports/status-report-contas-pagas",
    title: "Relatório de Contas Pagas",
    description:
      "Contas pagas do período — origem, categorias, beneficiários e semanas em PDF.",
    icon: Receipt,
  },
  {
    href: "/reports/status-report-cofre",
    title: "Relatório do Caixa Recepção",
    description:
      "Saldo do caixa recepção do período — entradas em dinheiro/PIX e saídas, em imagem.",
    icon: Vault,
  },
  {
    href: "/reports/status-report-recebimentos",
    title: "Relatório de Recebimentos",
    description:
      "Conferência lançamento a lançamento das entradas do período, com paciente e frascos, em PDF.",
    icon: FileText,
  },
  {
    href: "/reports/status-report-safe",
    title: "Relatório Executivo do Cofre",
    description:
      "Posição e movimentação do dinheiro no Cofre da Tesouraria — waterfall, saldo semanal e composição, em imagem.",
    icon: Landmark,
  },
];

export function ReportsCatalogScreen() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm">
          Escolha um relatório para gerar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const card = (
            <Card className="hover:border-primary/50 h-full transition-colors hover:shadow-md">
              <CardContent className="flex flex-col gap-3 p-5">
                <span className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{report.title}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {report.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );

          return report.external ? (
            <a
              key={report.href}
              href={report.href}
              target="_blank"
              rel="noreferrer"
            >
              {card}
            </a>
          ) : (
            <Link key={report.href} href={report.href}>
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
