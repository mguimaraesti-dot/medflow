"use client";

import { useState } from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { SupplierPersonType } from "@/features/suppliers/domain/supplier.entity";

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
  reset: () => void;
}

export function useSupplierFormState(): SupplierFormState {
  const [name, setName] = useState("");
  const [personType, setPersonType] =
    useState<SupplierPersonType>("PESSOA_JURIDICA");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setName("");
    setPersonType("PESSOA_JURIDICA");
    setDocument("");
    setPhone("");
    setEmail("");
    setNotes("");
  }

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
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Nome/Razão Social</Label>
        <Input
          id={`${idPrefix}-name`}
          value={state.name}
          onChange={(event) => state.setName(event.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-person-type`}>
            Tipo do Beneficiário
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
          <Label htmlFor={`${idPrefix}-document`}>CPF/CNPJ (opcional)</Label>
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-phone`}>Telefone</Label>
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
          <Label htmlFor={`${idPrefix}-email`}>E-mail (opcional)</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={state.email}
            onChange={(event) => state.setEmail(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-notes`}>Observações (opcional)</Label>
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
