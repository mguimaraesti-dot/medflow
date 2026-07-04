export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  document: string | null;
  active: boolean;
}
