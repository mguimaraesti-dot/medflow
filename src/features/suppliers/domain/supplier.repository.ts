import type { Supplier } from "./supplier.entity";

export interface CreateSupplierInput {
  organizationId: string;
  name: string;
  document?: string;
}

export interface SupplierRepository {
  listActive(organizationId: string): Promise<Supplier[]>;
  create(data: CreateSupplierInput): Promise<Supplier>;
}
