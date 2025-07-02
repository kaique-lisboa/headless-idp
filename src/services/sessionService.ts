import { RedisClientType } from "@redis/client";
import Elysia from "elysia";
import { AuthState } from "@/middlewares/session/sessionStates";
import { Config, config as configImport } from "@/core/config";
import { redisClient } from "@/core/redis";
import { TenantMismatchError } from "@/core/errors";

export class SessionService {

  constructor(
    private readonly client: RedisClientType = redisClient,
    private readonly config: Config = configImport,
  ) { }

  private getSessionKey(sessionId: string) {
    return `session:${sessionId}`;
  }

  private createEmptyState(): AuthState {
    return {
      version: 1,
      auth: {
        step: 'idle',
      }
    }
  }

  async getSession(sessionId: string, tenantId: string) {
    const sessionRaw = await this.client.get(this.getSessionKey(sessionId));
    if (sessionRaw) {
      this.verifyTenantMismatch(JSON.parse(sessionRaw) as AuthState, tenantId);
      return JSON.parse(sessionRaw) as AuthState;
    }
    return this.createEmptyState();
  }

  async getOrCreateSession(sessionId: string, tenantId: string, expiresIn: number) {
    let sessionRaw = await this.client.get(
      this.getSessionKey(sessionId),
    );

    if (sessionRaw) {
      const session = JSON.parse(sessionRaw) as AuthState;
      this.verifyTenantMismatch(session, tenantId);
      return JSON.parse(sessionRaw) as AuthState;
    }

    const sessionState = this.createEmptyState();
    sessionRaw = JSON.stringify(sessionState);
    await this.client.set(this.getSessionKey(sessionId), sessionRaw, {
      EX: expiresIn,
    });

    return sessionState;
  }

  private verifyTenantMismatch(session: AuthState, tenantId: string) {
    if ('state' in session.auth && session.auth.state.tenantId !== tenantId) {
      throw TenantMismatchError;
    }
  }

  async setSession(sessionId: string, state: Partial<AuthState>, expiresIn?: number) {
    const cachedState = await this.client.get(`session:${sessionId}`);
    let authState = cachedState ? JSON.parse(cachedState) as AuthState : this.createEmptyState();
    const newState = { ...authState, ...state };
    let ttl = await this.client.ttl(this.getSessionKey(sessionId));

    await this.client.set(
      this.getSessionKey(sessionId),
      JSON.stringify(newState),
      { expiration: { type: 'EX', value: expiresIn ?? ttl } });
    return authState;
  }

}

export const sessionService = new SessionService();

export const sessionMiddleware = new Elysia({ name: 'sessionMiddleware' })
  .decorate('sessionService', sessionService)