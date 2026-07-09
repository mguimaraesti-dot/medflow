"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createUserSchema } from "../application/dtos/create-user.dto";
import { useCreateUser } from "./use-create-user";
import { useUpdateUser } from "./use-update-user";
import { useRoles } from "./use-roles";
import { ApiError } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
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
    }
  }, [open, user, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateUser.mutateAsync({
          userId: user.id,
          input: { name: values.name, roleId: values.roleId },
        });
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

  const isPending = createUser.isPending || updateUser.isPending;

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
                ? "Altere o nome ou o perfil de acesso."
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
                      {roles?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.description ?? role.name}
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
