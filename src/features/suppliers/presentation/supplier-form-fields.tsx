"use client";

import { useCallback, useState } from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { SupplierPersonType } from "@/features/suppliers/domain/supplier.entity";

/** Marca visual de campo obrigatório — não espera o erro de validação aparecer pra avisar (mesmo padrão de `cash-flow-entry-form.tsx`). */
function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden>
      {" "}
      *
    </span>
  );
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** CPF (até 11 dígitos) ou CNPJ (12 a 14) — detectado pela quantidade de dígitos digitados. */
function formatDocument(rawValue: string): string {
  const digits = onlyDigits(rawValue).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(rawValue: string): string {
  const digits = onlyDigits(rawValue).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

/** Usado tanto pra popular o formulário na 1ª renderização (`useSupplierFormState(initial)`) quanto pra repopular via `reset(values)` — ex: Drawer trocando de "Novo" pra "Editar"/"Duplicar" sem desmontar. */
export interface SupplierFormValues {
  name?: string;
  personType?: SupplierPersonType;
  document?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface SupplierFormState {
  name: string;
  setName: (value: string) => void;
  personType: SupplierPersonType;
  setPersonType: (value: SupplierPersonType) => void;
  document: string;
  setDocument: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  isValid: boolean;
  reset: (values?: SupplierFormValues) => void;
}

export function useSupplierFormState(
  initial?: SupplierFormValues,
): SupplierFormState {
  const [name, setName] = useState(initial?.name ?? "");
  const [personType, setPersonType] = useState<SupplierPersonType>(
    initial?.personType ?? "PESSOA_JURIDICA",
  );
  const [document, setDocument] = useState(initial?.document ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Identidade estável (sem depender de nada que mude a cada render) —
  // permite usar `reset` na dependency array de um `useEffect` sem loop
  // infinito (ex: SupplierDrawer repopulando ao trocar de beneficiário).
  const reset = useCallback((values?: SupplierFormValues) => {
    setName(values?.name ?? "");
    setPersonType(values?.personType ?? "PESSOA_JURIDICA");
    setDocument(values?.document ?? "");
    setPhone(values?.phone ?? "");
    setEmail(values?.email ?? "");
    setNotes(values?.notes ?? "");
  }, []);

  return {
    name,
    setName,
    personType,
    setPersonType,
    document,
    setDocument,
    phone,
    setPhone,
    email,
    setEmail,
    notes,
    setNotes,
    isValid: name.trim().length > 0 && phone.trim().length > 0,
    reset,
  };
}

/** Layout compacto em 4 linhas — usado tanto no cadastro dedicado (`/suppliers`) quanto no diálogo rápido do combobox. */
export function SupplierFormFields({
  state,
  idPrefix = "supplier",
}: {
  state: SupplierFormState;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold">Dados Principais</p>
          <Separator className="mt-2" />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name`}>
            Nome/Razão Social
            <RequiredMark />
          </Label>
          <Input
            id={`${idPrefix}-name`}
            value={state.name}
            onChange={(event) => state.setName(event.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-person-type`}>
              Tipo
              <RequiredMark />
            </Label>
            <Select
              value={state.personType}
              onValueChange={(value) =>
                state.setPersonType(value as SupplierPersonType)
              }
            >
              <SelectTrigger id={`${idPrefix}-person-type`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PESSOA_JURIDICA">Pessoa Jurídica</SelectItem>
                <SelectItem value="PESSOA_FISICA">Pessoa Física</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-document`}>CPF/CNPJ</Label>
            <Input
              id={`${idPrefix}-document`}
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={state.document}
              onChange={(event) =>
                state.setDocument(formatDocument(event.target.value))
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold">Contato</p>
          <Separator className="mt-2" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-phone`}>
              Telefone
              <RequiredMark />
            </Label>
            <Input
              id={`${idPrefix}-phone`}
              inputMode="numeric"
              placeholder="(17) 99999-9999"
              value={state.phone}
              onChange={(event) =>
                state.setPhone(formatPhone(event.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-email`}>E-mail</Label>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={state.email}
              onChange={(event) => state.setEmail(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Observações</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          rows={2}
          value={state.notes}
          onChange={(event) => state.setNotes(event.target.value)}
        />
      </div>
    </div>
  );
}
