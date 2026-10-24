import type { components } from '../../lib/api/generated/schema';
import { ApiClientError, createApiClient, type ApiClient } from '../../lib/api/client';
import { clearCatalogCache } from '../venue-catalog/catalog-cache';
import { sharedManagementRealtime } from '../realtime/realtime-client';

type Role = components['schemas']['CurrentUserResponse']['data']['roles'][number];

export type CurrentActor = Readonly<{
  accountId: string;
  displayEmail: string;
  roles: readonly Role[];
  sessionId: string;
}>;

type SessionCredential = Readonly<{
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

const anonymousSnapshot = { status: 'anonymous', denial: null } as const;
const resetPattern = /^wip_[A-Za-z0-9_-]{43}$/u;

export function consumeResetFragment(
  href: string,
  replaceHistory: (safePath: string) => void,
): string | null {
  const url = new URL(href);
  const raw = url.hash.slice(1);
  const token = new URLSearchParams(raw).get('resetToken') ?? (resetPattern.test(raw) ? raw : null);
  replaceHistory(`${url.pathname}${url.search}`);
  return token !== null && resetPattern.test(token) ? token : null;
}

const STORAGE_KEY = 'wedding_ops_session';
export const managementSessionRevokedEvent = 'wedding:management-session-revoked';

interface PersistedSessionData {
  accessToken: string;
  accessExpiresAt: string;
  sessionId: string;
  actor: CurrentActor;
  presentation: 'denied' | 'manager' | 'staff';
}

export class ManagementIdentitySession {
  private accessToken: string | null = null;
  private authGeneration = 0;
  private restoreOperation: Promise<ManagementSessionSnapshot> | null = null;
  private state: ManagementSessionSnapshot = anonymousSnapshot;

  constructor(private readonly api: IdentityApi) {
    sharedManagementRealtime.setTokenRefreshHandler(() => this.renewAccessToken());
    sharedManagementRealtime.setSessionRevokedHandler(() => {
      this.clear();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(managementSessionRevokedEvent));
      }
    });
  }

  snapshot(): ManagementSessionSnapshot {
    return this.state;
  }

  discardRevokedSession(): void {
    this.clear();
  }

  async login(email: string, password: string): Promise<ManagementSessionSnapshot> {
    return this.finishSignIn(await this.api.createSession(email, password));
  }

  restore(): Promise<ManagementSessionSnapshot> {
    const persisted = this.readPersisted();
    if (persisted && persisted.accessToken) {
      const expiresAt = new Date(persisted.accessExpiresAt).getTime();
      if (expiresAt > Date.now() + 15_000) {
        this.accessToken = persisted.accessToken;
        this.state = {
          status: 'authenticated',
          actor: persisted.actor,
          denial: null,
          presentation: persisted.presentation,
        };
        sharedManagementRealtime.connect(persisted.accessToken);
        return Promise.resolve(this.state);
      }
    } else if (
      typeof window !== 'undefined' &&
      persisted === null &&
      this.state.status === 'authenticated'
    ) {
      this.clear();
    }

    if (this.state.status === 'authenticated' && this.accessToken !== null) {
      return Promise.resolve(this.state);
    }

    this.restoreOperation ??= this.restoreFromCookie().finally(() => {
      this.restoreOperation = null;
    });
    return this.restoreOperation;
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.api.requestPasswordReset(email);
  }

  async completePasswordReset(token: string, password: string): Promise<void> {
    try {
      await this.api.completePasswordReset(token, password);
    } finally {
      this.clear();
    }
  }

  async logout(): Promise<void> {
    const token = this.accessToken;
    try {
      if (token !== null) await this.api.logout(token);
    } finally {
      this.clear();
    }
  }

  private renewOperation: Promise<string | null> | null = null;

  private renewAccessToken(): Promise<string | null> {
    const generation = this.authGeneration;
    this.renewOperation ??= this.api
      .refreshSession()
      .then((credential) => {
        if (generation !== this.authGeneration) return null;
        this.accessToken = credential.accessToken;
        sharedManagementRealtime.updateToken(credential.accessToken);
        const persisted = this.readPersisted();
        if (persisted) {
          this.persist({
            ...persisted,
            accessToken: credential.accessToken,
            accessExpiresAt: credential.accessExpiresAt,
            sessionId: credential.sessionId,
          });
        }
        return credential.accessToken;
      })
      .catch(() => {
        if (generation === this.authGeneration) this.clear();
        return null;
      })
      .finally(() => {
        this.renewOperation = null;
      });
    return this.renewOperation;
  }

  async authorize<T>(operation: (accessToken: string) => Promise<T>): Promise<T> {
    if (this.accessToken === null) {
      const persisted = this.readPersisted();
      if (persisted && persisted.accessToken) {
        this.accessToken = persisted.accessToken;
        this.state = {
          status: 'authenticated',
          actor: persisted.actor,
          denial: null,
          presentation: persisted.presentation,
        };
      }
    }
    if (this.accessToken === null) throw new Error('Authentication is required.');

    try {
      return await operation(this.accessToken);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        const renewed = await this.renewAccessToken();
        if (renewed === null) throw error;
        try {
          return await operation(renewed);
        } catch (retryError) {
          this.handleDenial(retryError);
          throw retryError;
        }
      }
      this.handleDenial(error);
      throw error;
    }
  }

  private handleDenial(error: unknown): void {
    if (error instanceof ApiClientError && error.status === 401) {
      this.clear();
    } else if (
      this.state.status === 'authenticated' &&
      error instanceof ApiClientError &&
      (error.status === 403 || error.status === 404)
    ) {
      this.state = {
        ...this.state,
        denial: error.status === 403 ? 'forbidden' : 'not-found',
      };
    }
  }

  private readPersisted(): PersistedSessionData | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedSessionData;
    } catch {
      return null;
    }
  }

  private persist(data: PersistedSessionData): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  private removePersisted(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  private async restoreFromCookie(): Promise<ManagementSessionSnapshot> {
    const generation = this.authGeneration;
    try {
      const credential = await this.api.refreshSession();
      if (generation !== this.authGeneration) return this.state;
      return await this.finishSignIn(credential);
    } catch {
      if (generation === this.authGeneration) this.clear();
      return this.state;
    }
  }

  private async finishSignIn(credential: SessionCredential): Promise<ManagementSessionSnapshot> {
    const generation = this.authGeneration;
    this.accessToken = credential.accessToken;
    try {
      const actor = await this.api.getCurrentUser(credential.accessToken);
      if (generation !== this.authGeneration) return this.state;
      const presentation = actor.roles.includes('MANAGER')
        ? 'manager'
        : actor.roles.includes('STAFF')
          ? 'staff'
          : 'denied';
      this.state = { status: 'authenticated', actor, denial: null, presentation };
      sharedManagementRealtime.connect(credential.accessToken);
      this.persist({
        accessToken: credential.accessToken,
        accessExpiresAt: credential.accessExpiresAt,
        sessionId: credential.sessionId,
        actor,
        presentation,
      });
      return this.state;
    } catch (error) {
      if (generation === this.authGeneration) this.clear();
      throw error;
    }
  }

  private clear(): void {
    this.authGeneration++;
    this.accessToken = null;
    this.state = anonymousSnapshot;
    this.removePersisted();
    clearCatalogCache();
    sharedManagementRealtime.disconnect();
  }
}

function requireData<T>(data: T | undefined): T {
  if (data === undefined) throw new Error('The identity response did not include data.');
  return data;
}

export function createIdentityApi(client?: ApiClient): IdentityApi {
  let resolvedClient = client;
  const api = () => (resolvedClient ??= createApiClient());

  return {
    async completePasswordReset(token, newPassword) {
      await api().POST('/auth/password-reset-completions', {
        body: { resetToken: token, newPassword },
      });
    },
    async createSession(email, password) {
      const { data } = await api().POST('/auth/web-sessions', {
        body: { email, password },
        credentials: 'include',
      });
      return requireData(data).data;
    },
    async getCurrentUser(accessToken) {
      const { data } = await api().GET('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return normalizeActor(requireData(data).data);
    },
    async logout(accessToken) {
      await api().DELETE('/auth/sessions/current', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    async refreshSession() {
      const { data } = await api().POST('/auth/web-session-refreshes', {
        body: {},
        credentials: 'include',
        params: { cookie: { '__Host-wedding-refresh': '' } },
      });
      return requireData(data).data;
    },
    async requestPasswordReset(email) {
      await api().POST('/auth/password-reset-requests', { body: { email } });
    },
  };
}

function normalizeActor(
  actor: Readonly<{
    accountId: string;
    displayEmail: string;
    roles: ArrayLike<Role>;
    sessionId: string;
  }>,
): CurrentActor {
  return { ...actor, roles: Array.from(actor.roles) };
}

export const sharedManagementSession = new ManagementIdentitySession(createIdentityApi());
