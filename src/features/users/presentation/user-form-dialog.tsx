"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createUserSchema } from "../application/dtos/create-user.dto";
import { useCreateUser } from "./use-create-user";
import { useUpdateUser } from "./use-update-user";
import { useSetUserStatus } from "./use-set-user-status";
import { useRoles } from "./use-roles";
import { ApiError } from "@/shared/lib/api-client";
import {
  VISIBLE_ROLE_NAMES,
  getRoleLabel,
} from "@/core/permissions/roles-permissions";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type { UserResponseDTO } from "../application/dtos/user.response-dto";

interface FormValues {
  name: string;
  email: string;
  roleId: string;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = criar usuário novo. */
  user: UserResponseDTO | null;
  currentUserId: string;
}) {
  const isEdit = user !== null;
  const isSelf = isEdit && user.id === currentUserId;
  const { data: roles } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const setUserStatus = useSetUserStatus();
  const [isActive, setIsActive] = useState(true);

  const visibleRoles = roles?.filter((role) =>
    (VISIBLE_ROLE_NAMES as readonly string[]).includes(role.name),
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createUserSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: user?.name ?? "",
        email: user?.email ?? "",
        roleId: user?.roleId ?? "",
      });
      setIsActive(user?.status !== "INACTIVE");
    }
  }, [open, user, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateUser.mutateAsync({
          userId: user.id,
          input: { name: values.name, roleId: values.roleId },
        });
        // Ativar um PENDING já acontece sozinho ao salvar o perfil
        // (backend). Aqui só cobre os casos que dependem do checkbox:
        // reativar quem estava INACTIVE, ou rejeitar (deixar INACTIVE)
        // alguém que acabaria de ser ativado.
        if (!isSelf) {
          if (isActive && user.status === "INACTIVE") {
            await setUserStatus.mutateAsync({
              userId: user.id,
              status: "ACTIVE",
            });
          } else if (!isActive && user.status !== "INACTIVE") {
            await setUserStatus.mutateAsync({
              userId: user.id,
              status: "INACTIVE",
            });
          }
        }
        toast.success("Usuário atualizado.");
      } else {
        await createUser.mutateAsync(values);
        toast.success("Convite enviado por e-mail.");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar o usuário.",
      );
    }
  }

  const isPending =
    createUser.isPending || updateUser.isPending || setUserStatus.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Altere o nome, o perfil de acesso ou o status."
                : "Um e-mail de convite será enviado para o usuário definir a própria senha."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                disabled={isEdit}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleId">Perfil</Label>
              <Controller
                control={control}
                name="roleId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSelf}
                  >
                    <SelectTrigger id="roleId">
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleRoles?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {getRoleLabel(role.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {isSelf && (
                <p className="text-muted-foreground text-xs">
                  Você não pode alterar o seu próprio perfil de acesso.
                </p>
              )}
              {errors.roleId && (
                <p className="text-destructive text-sm">
                  {errors.roleId.message}
                </p>
              )}
            </div>

            {isEdit && !isSelf && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="isActive" className="font-normal">
                  Usuário ativo
                </Label>
              </div>
            )}
            {isEdit && isSelf && (
              <p className="text-muted-foreground text-xs">
                Você não pode ativar ou desativar o seu próprio usuário.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
