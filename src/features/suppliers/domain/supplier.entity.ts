export type SupplierPersonType = "PESSOA_FISICA" | "PESSOA_JURIDICA";

export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  personType: SupplierPersonType;
  document: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
}
