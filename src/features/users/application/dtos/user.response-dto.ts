import type {
  ManagedUser,
  ManagedUserStatus,
} from "../../domain/managed-user.entity";

export interface UserResponseDTO {
  id: string;
  organizationId: string | null;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  status: ManagedUserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export function toUserResponseDTO(user: ManagedUser): UserResponseDTO {
  return { ...user };
}
