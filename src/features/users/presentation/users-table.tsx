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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatDateOnlyBR, formatDateTimeBR } from "@/shared/lib/format";
import type { UserResponseDTO } from "../application/dtos/user.response-dto";

const STATUS_META: Record<
  UserResponseDTO["status"],
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "🟢 Ativo",
    className:
      "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500",
  },
  INACTIVE: {
    label: "⚪ Inativo",
    className:
      "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
  PENDING: {
    label: "🟡 Pendente",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

export function UsersTable({
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead>Perfil</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead>Último acesso</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const status = STATUS_META[user.status];
          const isSelf = user.id === currentUserId;

          return (
            <TableRow
              key={user.id}
              className="hover:bg-muted/50 cursor-pointer transition-shadow hover:shadow-[inset_3px_0_0_0_var(--primary)]"
              onClick={() => onEdit(user)}
            >
              <TableCell>
                <p className="font-medium">
                  {user.name}
                  {isSelf && (
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      (você)
                    </span>
                  )}
                </p>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.email}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.roleName ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateOnlyBR(user.createdAt)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.lastLoginAt ? formatDateTimeBR(user.lastLoginAt) : "—"}
              </TableCell>
              <TableCell
                className="text-right"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
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
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
