export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  document: string | null;
  contactName: string | null;
  phone: string | null;
  active: boolean;
}
