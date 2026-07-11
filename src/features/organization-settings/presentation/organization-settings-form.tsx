"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  updateOrganizationSettingsSchema,
  type UpdateOrganizationSettingsInput,
} from "../application/dtos/update-organization-settings.dto";
import { useOrganizationSettings } from "./use-organization-settings";
import { useUpdateOrganizationSettings } from "./use-update-organization-settings";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function OrganizationSettingsForm() {
  const { data: settings, isLoading } = useOrganizationSettings();
  const updateSettings = useUpdateOrganizationSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateOrganizationSettingsInput>({
    resolver: zodResolver(updateOrganizationSettingsSchema),
    defaultValues: { whatsapp: "" },
  });

  useEffect(() => {
    if (settings) reset({ whatsapp: settings.whatsapp ?? "" });
  }, [settings, reset]);

  async function onSubmit(values: UpdateOrganizationSettingsInput) {
    try {
      await updateSettings.mutateAsync(values);
      toast.success("Configurações salvas.");
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
    }
  }

  if (isLoading) return null;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-sm space-y-4 rounded-lg border p-6"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp da clínica</Label>
        <Input
          id="whatsapp"
          placeholder="11999999999"
          {...register("whatsapp")}
        />
        <p className="text-muted-foreground text-sm">
          Número que recebe os lembretes de cobrança de Contas a Pagar.
        </p>
        {errors.whatsapp && (
          <p className="text-destructive text-sm">{errors.whatsapp.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
