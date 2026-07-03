export interface AuthenticatedUser {
  id: string;
  organizationId: string | null;
  name: string;
  email: string;
  supabaseAuthId: string;
  roleId: string;
  roleName: string;
  active: boolean;
}
