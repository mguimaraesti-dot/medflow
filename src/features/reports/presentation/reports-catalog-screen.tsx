"use client";

import Link from "next/link";
import { FileText, Receipt, Vault, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";

interface ReportCatalogItem {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

/** Vitrine de relatórios (cards clicáveis), pronta pra crescer sem precisar reestruturar quando novos relatórios chegarem. */
const REPORTS: ReportCatalogItem[] = [
  {
    href: "/reports/status-report-contas-pagas",
    title: "Relatório de Contas Pagas",
    description:
      "Contas pagas do período — origem, categorias, beneficiários e semanas em imagem.",
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
          return (
            <Link key={report.href} href={report.href}>
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
