"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const REMINDER_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

export function OrganizationSettingsForm() {
  const { data: settings, isLoading } = useOrganizationSettings();
  const updateSettings = useUpdateOrganizationSettings();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateOrganizationSettingsInput>({
    resolver: zodResolver(updateOrganizationSettingsSchema),
    defaultValues: {
      whatsapp: "",
      accountsPayableReminderWhatsapp: "",
      reminderSendHour: 7,
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        whatsapp: settings.whatsapp ?? "",
        accountsPayableReminderWhatsapp:
          settings.accountsPayableReminderWhatsapp ?? "",
        reminderSendHour: settings.reminderSendHour,
      });
    }
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

      <div className="space-y-2">
        <Label htmlFor="accountsPayableReminderWhatsapp">
          Destino dos lembretes de Contas a Pagar
        </Label>
        <Input
          id="accountsPayableReminderWhatsapp"
          placeholder="11999999999 ou 120363...-group"
          {...register("accountsPayableReminderWhatsapp")}
        />
        <p className="text-muted-foreground text-sm">
          Só para os lembretes automáticos de Contas a Pagar (com botão
          &quot;Pago&quot;). Aceita um número de WhatsApp ou o ID de um grupo.
          Deixe em branco para usar o WhatsApp da clínica acima.
        </p>
        {errors.accountsPayableReminderWhatsapp && (
          <p className="text-destructive text-sm">
            {errors.accountsPayableReminderWhatsapp.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reminderSendHour">
          Horário de envio dos lembretes de cobrança
        </Label>
        <Controller
          name="reminderSendHour"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
            >
              <SelectTrigger id="reminderSendHour" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_HOUR_OPTIONS.map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {String(hour).padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-muted-foreground text-sm">
          Hora do dia (fuso da clínica) em que os lembretes de contas a vencer
          são enviados.
        </p>
        {errors.reminderSendHour && (
          <p className="text-destructive text-sm">
            {errors.reminderSendHour.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
