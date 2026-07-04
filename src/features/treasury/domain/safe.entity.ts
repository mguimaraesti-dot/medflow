/**
 * Cofre — um por organização (1:1, como `OrganizationSettings`). O
 * saldo nunca é um campo persistido: é sempre derivado da soma das
 * movimentações (`SafeMovement`), Coding Standards item 18.1.
 */
export interface Safe {
  id: string;
  organizationId: string;
  createdAt: Date;
}
