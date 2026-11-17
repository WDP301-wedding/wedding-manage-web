import type { components } from '@/src/lib/api/generated/schema';

export type Role = components['schemas']['CurrentUserResponse']['data']['roles'][number];

export type CurrentActor = Readonly<{
  accountId: string;
  displayEmail: string;
  roles: readonly Role[];
  sessionId: string;
}>;

export type SessionCredential = Readonly<{
  accessToken: string;
  accessExpiresAt: string;
  sessionId: string;
}>;

export interface IdentityApi {
  completePasswordReset(this: void, token: string, newPassword: string): Promise<void>;
  createSession(this: void, email: string, password: string): Promise<SessionCredential>;
  getCurrentUser(this: void, accessToken: string): Promise<CurrentActor>;
  logout(this: void, accessToken: string): Promise<void>;
  refreshSession(this: void): Promise<SessionCredential>;
  requestPasswordReset(this: void, email: string): Promise<void>;
}

export type ManagementSessionSnapshot =
  | Readonly<{ status: 'anonymous'; denial: null }>
  | Readonly<{
      status: 'authenticated';
      actor: CurrentActor;
      denial: 'forbidden' | 'not-found' | null;
      presentation: 'denied' | 'manager' | 'staff';
    }>;

export interface PersistedSessionData {
  accessToken: string;
  accessExpiresAt: string;
  sessionId: string;
  actor: CurrentActor;
  presentation: 'denied' | 'manager' | 'staff';
}
