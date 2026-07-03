import type { AuthenticatedUser } from "./user.entity";

export interface UserRepository {
  findBySupabaseAuthId(
    supabaseAuthId: string,
  ): Promise<AuthenticatedUser | null>;
  findByEmail(email: string): Promise<AuthenticatedUser | null>;
}
