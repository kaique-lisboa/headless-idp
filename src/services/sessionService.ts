import { RedisClientType } from "@redis/client";
import Elysia from "elysia";
import { AuthState } from "@/middlewares/session/sessionStates";
import { Config, config as configImport } from "@/core/config";
import { redisClient } from "@/core/redis";

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

  async getSession(sessionId: string) {
    const session = await this.client.get(this.getSessionKey(sessionId));
    return session ? JSON.parse(session) as AuthState : null;
  }

  async getOrCreateSession(sessionId: string) {
    let session = await this.client.get(
      this.getSessionKey(sessionId),
    );

    if (session) {
      return JSON.parse(session) as AuthState;
    }

    const sessionState = this.createEmptyState();
    session = JSON.stringify(sessionState);
    await this.client.set(this.getSessionKey(sessionId), session, {
      EX: this.config.tenants[0].oidc_clients[0].session_expiration_time,
    });

    return sessionState;
  }

  async setSession(sessionId: string, state: Partial<AuthState>, expiresIn?: number) {
    const cachedState = await this.client.get(`session:${sessionId}`);
    let authState = cachedState ? JSON.parse(cachedState) as AuthState : this.createEmptyState();
    const newState = { ...authState, ...state };
    const ttl = await this.client.ttl(this.getSessionKey(sessionId));
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