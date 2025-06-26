import { RedisClientType } from "@redis/client";
import { createHash } from "crypto";
import * as jose from 'jose';
import { redisClient as redisClientImport } from "@/core/redis";
import { logger } from "@/core/logger";
import { AuthState } from "@/middlewares/session/sessionStates";
import { Config, config as configImport } from "@/core/config";
import { SessionService, sessionService as sessionServiceImport } from "@/services/sessionService";

export class OidcService {
  constructor(
    private readonly tenantConfig: Config['tenants'][number],
    private readonly oidcClientConfig: Config['tenants'][number]['oidc_clients'][number],
    private readonly config: Config = configImport,
    private readonly redisClient: RedisClientType = redisClientImport,
    private readonly sessionService: SessionService = sessionServiceImport,
  ) { }

  private getAuthTokenKey(code: string) {
    return `oidc:session_snapshot_by_code:${code}`;
  }

  async getAuthToken(code: string) {
    const authToken = await this.redisClient.get(this.getAuthTokenKey(code));
    return authToken;
  }

  async createAccessToken(authCode: string, codeVerifier: string) {
    const rawState = await this.redisClient.get(this.getAuthTokenKey(authCode));

    if (rawState === null) {
      logger.error({ authCode }, 'Auth code not found');
      throw new Error('Session not found');
    }

    const state = JSON.parse(rawState) as AuthState;

    if (state.version !== 1 || state.auth.step !== 'user_creds_match') {
      logger.error({ authCode }, 'Invalid auth code');
      throw new Error('Invalid auth code');
    }

    const { code_challenge, code_challenge_method } = state.auth.state.authorizeParams;

    // PKCE Verification
    this.VerifyPKCE(code_challenge_method, authCode, codeVerifier, code_challenge);

    const authToken = await new jose.SignJWT({
      iss: `${this.config.hostname}/${this.tenantConfig.id}`, // Issuer
      sub: state.auth.state.user?.id, // Subject
      aud: this.oidcClientConfig.client_id, // Audience
      email: state.auth.state.user?.email,
      name: state.auth.state.user?.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.oidcClientConfig.jwt_expiration_time)
      .sign(new TextEncoder().encode(this.tenantConfig.oidc_config.jwt_secret));

    return authToken;
  }

  private VerifyPKCE(code_challenge_method: string, authCode: string, codeVerifier: string, code_challenge: string) {
    if (code_challenge_method !== 'S256') {
      logger.error({ authCode }, 'Invalid code challenge method');
      throw new Error('Invalid code challenge method');
    }

    const codeVerifierHash = createHash("sha256")
      .update(codeVerifier)
      .digest("base64");

    if (code_challenge !== codeVerifierHash) {
      logger.error({ code_challenge, codeVerifierHash }, 'Code verifier mismatch');
      throw new Error('Code verifier mismatch');
    }
  }

  async createAuthCode(sessionId: string) {

    const state = await this.sessionService.getSession(sessionId);

    if (state === null) {
      logger.error({ sessionId }, 'Session not found');
      throw new Error('Session not found');
    }

    const authCode = crypto.randomUUID();

    await this.redisClient.set(this.getAuthTokenKey(authCode), JSON.stringify(state), {
      EX: this.oidcClientConfig.session_expiration_time,
    });

    return authCode;
  }
}
