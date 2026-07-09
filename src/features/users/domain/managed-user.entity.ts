export type ManagedUserStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export interface ManagedUser {
  id: string;
  organizationId: string | null;
  name: string;
  email: string;
  roleId: string | null;
  /** `null` enquanto PENDING (ainda sem perfil atribuído). */
  roleName: string | null;
  status: ManagedUserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
}
