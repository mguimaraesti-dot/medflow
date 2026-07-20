"use client";

import { useState } from "react";
import { Plus, Search, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { useUsers } from "./use-users";
import { useSetUserStatus } from "./use-set-user-status";
import { UsersTable } from "./users-table";
import { UsersCards } from "./users-cards";
import { UserFormDialog } from "./user-form-dialog";
import { ApiError } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { EmptyState } from "@/shared/components/empty-state";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { UserResponseDTO } from "../application/dtos/user.response-dto";

const STATUS_LABEL: Record<"ALL" | UserResponseDTO["status"], string> = {
  ALL: "Todos os status",
  ACTIVE: "Ativos",
  INACTIVE: "Inativos",
  PENDING: "Pendentes",
};

export function UsersScreen({ currentUserId }: { currentUserId: string }) {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | UserResponseDTO["status"]>(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponseDTO | null>(null);

  const { data, isLoading } = useUsers({
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
    page,
    pageSize: 20,
  });
  const setUserStatus = useSetUserStatus();

  function openCreate() {
    setEditingUser(null);
    setFormOpen(true);
  }

  function openEdit(user: UserResponseDTO) {
    setEditingUser(user);
    setFormOpen(true);
  }

  async function handleToggleStatus(user: UserResponseDTO) {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await setUserStatus.mutateAsync({ userId: user.id, status: nextStatus });
      toast.success(
        nextStatus === "INACTIVE"
          ? "Usuário desativado."
          : "Usuário reativado.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível atualizar o status do usuário.",
      );
    }
  }

  const users = data?.items ?? [];

  return (
    <div className={cn("space-y-4", isMobile && "pb-20")}>
      {isMobile && data && (
        <p className="text-muted-foreground text-sm">
          {data.total} cadastrado{data.total === 1 ? "" : "s"}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as typeof status);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {!isLoading && users.length === 0 && (
            <EmptyState
              icon={UsersIcon}
              title={
                search.trim()
                  ? "Nenhum usuário encontrado."
                  : "Nenhum usuário cadastrado."
              }
              description={
                search.trim()
                  ? "Tente buscar por outro nome ou e-mail."
                  : 'Clique em "Novo Usuário" para enviar o primeiro convite.'
              }
            />
          )}

          {!isLoading && users.length > 0 && (
            <>
              {isMobile ? (
                <UsersCards
                  users={users}
                  currentUserId={currentUserId}
                  onEdit={openEdit}
                  onToggleStatus={handleToggleStatus}
                />
              ) : (
                <UsersTable
                  users={users}
                  currentUserId={currentUserId}
                  onEdit={openEdit}
                  onToggleStatus={handleToggleStatus}
                />
              )}
              {data && data.totalPages > 1 && (
                <div className="text-muted-foreground flex items-center justify-between pt-4 text-sm">
                  <span>
                    Página {data.page} de {data.totalPages} ({data.total}{" "}
                    usuário{data.total === 1 ? "" : "s"})
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        currentUserId={currentUserId}
      />
    </div>
  );
}
