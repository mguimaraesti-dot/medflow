"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { logger } from "@/core/logger/logger";

export default function DashboardGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Erro não tratado numa rota do painel", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="text-destructive h-10 w-10" />
      <h2 className="text-lg font-semibold">Algo deu errado nesta tela.</h2>
      <p className="text-muted-foreground max-w-sm text-sm">
        Tente novamente. Se o problema continuar, avise o suporte.
      </p>
      <Button type="button" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
