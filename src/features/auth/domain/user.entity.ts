export type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING";

export interface AuthenticatedUser {
  id: string;
  organizationId: string | null;
  name: string;
  email: string;
  supabaseAuthId: string;
  /** `null` enquanto o usuário está PENDING (ainda sem perfil atribuído). */
  roleId: string | null;
  roleName: string | null;
  status: UserStatus;
}
