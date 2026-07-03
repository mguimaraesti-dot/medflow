export interface PaymentMethod {
  id: string;
  organizationId: string;
  name: string;
  displayOrder: number;
  active: boolean;
}
