import type { Supplier, SupplierPersonType } from "./supplier.entity";

export interface CreateSupplierInput {
  organizationId: string;
  name: string;
  personType?: SupplierPersonType;
  document?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface SupplierRepository {
  listActive(organizationId: string): Promise<Supplier[]>;
  create(data: CreateSupplierInput): Promise<Supplier>;
}
