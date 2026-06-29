export type UserRole = 'admin' | 'hospital' | 'general';

export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId?: string;
  isActive: boolean;
  createdAt: number;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export interface AuthRequest extends Express.Request {
  user?: AuthPayload;
}
