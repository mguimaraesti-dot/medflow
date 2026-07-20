"use client";

import { Ban, CheckCircle2, MoreHorizontal, Pencil } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { getRoleLabel } from "@/core/permissions/roles-permissions";
import type { UserResponseDTO } from "../application/dtos/user.response-dto";

const STATUS_META: Record<
  UserResponseDTO["status"],
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Ativo",
    className:
      "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500",
  },
  INACTIVE: {
    label: "Inativo",
    className:
      "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
  PENDING: {
    label: "Pendente",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

/**
 * Lista mobile de Usuários — card em vez da tabela (que cortava e-mail
 * e empurrava Perfil/Status pra fora da tela). "⋯" reaproveita
 * exatamente o Editar/Ativar-Desativar que já existe na tabela desktop
 * — sem "Excluir" (não existe, só desativação).
 */
export function UsersCards({
  users,
  currentUserId,
  onEdit,
  onToggleStatus,
}: {
  users: UserResponseDTO[];
  currentUserId: string;
  onEdit: (user: UserResponseDTO) => void;
  onToggleStatus: (user: UserResponseDTO) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {users.map((user) => {
        const status = STATUS_META[user.status];
        const isSelf = user.id === currentUserId;

        return (
          <div
            key={user.id}
            className="bg-card rounded-xl border p-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
                  <span className="truncate">{user.name}</span>
                  {isSelf && (
                    <span className="text-muted-foreground shrink-0 text-xs font-normal">
                      (você)
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {user.email}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="-mt-1 -mr-2 shrink-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Mais ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(user)}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  {!isSelf && user.status !== "PENDING" && (
                    <DropdownMenuItem
                      variant={
                        user.status === "ACTIVE" ? "destructive" : "default"
                      }
                      onClick={() => onToggleStatus(user)}
                    >
                      {user.status === "ACTIVE" ? (
                        <>
                          <Ban className="h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Reativar
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <Badge variant="outline" className="font-normal">
                {user.roleName ? getRoleLabel(user.roleName) : "—"}
              </Badge>
              <Badge
                variant="outline"
                className={cn("gap-1.5 font-medium", status.className)}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {status.label}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
