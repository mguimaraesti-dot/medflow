"use client";

import Link from "next/link";
import { FileBarChart, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";

interface ReportCatalogItem {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

/** Só um relatório hoje — a tela já é uma vitrine (cards clicáveis), pronta pra crescer sem precisar reestruturar quando novos relatórios chegarem. */
const REPORTS: ReportCatalogItem[] = [
  {
    href: "/reports/status-report",
    title: "Status Report",
    description:
      "Resumo financeiro do período em imagem — pronto pra baixar ou enviar por WhatsApp.",
    icon: FileBarChart,
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
