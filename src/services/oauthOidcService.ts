import { RedisClientType } from "@redis/client";
import { createHash } from "crypto";
import * as jose from 'jose';
import { redisClient as redisClientImport } from "@/core/redis";
import { logger } from "@/core/logger";
import { AuthState, TokenEligibleState } from "@/middlewares/session/sessionStates";
import { Config, config as configImport } from "@/core/config";
import { SessionService, sessionService as sessionServiceImport } from "@/services/SessionService";

export class OauthOIDCService {

  private readonly oidcOnlyScopes = new Set(['openid', 'email', 'profile', 'phone', 'address', 'offline_access']);

  constructor(
    private readonly tenantConfig: Config['tenants'][number],
    private readonly config: Config = configImport,
    private readonly redisClient: RedisClientType = redisClientImport,
    private readonly sessionService: SessionService = sessionServiceImport,
  ) { }

  private getAuthTokenKey(code: string) {
    return `oidc:session_snapshot_by_code:${code}`;
  }

  async getAuthState(code: string) {
    const rawState = await this.redisClient.get(this.getAuthTokenKey(code));

    if (rawState === null) {
      logger.error({ code }, 'Auth code not found');
      throw new Error('Session not found');
    }

    const state = JSON.parse(rawState) as AuthState;
    return state;
  }

  async createToken(authCode: string, codeVerifier: string) {

    const state = await this.getAuthState(authCode);
    this.validateStateForTokenCreation(state);
    const oidcClient = this.tenantConfig.oidc_clients.find(client => client.client_id === state.auth.state.authorizeParams.client_id);

    if (!oidcClient) {
      logger.error({ state }, 'OIDC client not found');
      throw new Error('OIDC client not found');
    }

    const scopes = new Set(state.auth.state.authorizeParams.scope.split(' '));
    const { code_challenge, code_challenge_method } = state.auth.state.authorizeParams;
    this.verifyPKCE(code_challenge_method, authCode, codeVerifier, code_challenge);
    const hasOpenId = scopes.has('openid');

    const [idToken, accessToken] = await Promise.all([
      hasOpenId ? this.createIDToken(state, scopes, oidcClient) : null,
      scopes.size > (hasOpenId ? 1 : 0) ? this.createAccessToken(state, scopes, oidcClient) : null,
    ]);

    return {
      id_token: idToken,
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: oidcClient.jwt_expiration_time,
      refresh_token: null, // TODO: Implement refresh token
    };
  }

  private validateStateForTokenCreation(state?: AuthState | null): asserts state is TokenEligibleState {
    if (state?.version !== 1 || (state?.auth.step !== 'user_authenticated')) {
      throw new Error('Invalid state for token creation');
    }
  }

  private async createAccessToken(state: TokenEligibleState, scopes: Set<string>, oidcClientConfig: Config['tenants'][number]['oidc_clients'][number]) {
    const authToken = await new jose.SignJWT({
      iss: `${this.config.hostname}/${this.tenantConfig.id}`, // Issuer
      sub: state.auth.state.user?.id, // Subject
      aud: oidcClientConfig.client_id, // Audience
      scope: Array.from(scopes).filter(scope => scope !== 'openid')
        .filter(scope => oidcClientConfig.allowed_scopes.includes(scope)) // Validates client has access to the scope - safeguard, should be validated at controller and throw error
        .filter(scope => state.auth.state.user?.permissions.includes(scope)) // Validates user has permission to those scopes
        .filter(scope => !this.oidcOnlyScopes.has(scope)) // Validates scope is not an oidc only scope
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(oidcClientConfig.jwt_expiration_time)
      .sign(new TextEncoder().encode(this.tenantConfig.oidc_config.jwt_secret));

    return authToken;
  }

  private async createIDToken(state: TokenEligibleState, scopes: Set<string>, oidcClientConfig: Config['tenants'][number]['oidc_clients'][number]) {
    const authToken = await new jose.SignJWT({
      iss: `${this.config.hostname}/${this.tenantConfig.id}`, // Issuer
      sub: state.auth.state.user?.id, // Subject
      aud: oidcClientConfig.client_id, // Audience
      email: scopes.has('email') ? state.auth.state.user?.email : undefined,
      name: scopes.has('profile') ? state.auth.state.user?.name : undefined,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(oidcClientConfig.jwt_expiration_time)
      .sign(new TextEncoder().encode(this.tenantConfig.oidc_config.jwt_secret));

    return authToken;
  }

  private verifyPKCE(code_challenge_method: string, authCode: string, codeVerifier: string, code_challenge: string) {
    if (code_challenge_method !== 'S256') {
      logger.error({ authCode }, 'Invalid code challenge method');
      throw new Error('Invalid code challenge method');
    }

    const codeVerifierHash = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    if (code_challenge !== codeVerifierHash) {
      logger.error({ code_challenge, codeVerifierHash }, 'Code verifier mismatch');
      throw new Error('Code verifier mismatch');
    }
  }

  getOidcConfig(state: TokenEligibleState) {
    const clientId = state.auth.state.authorizeParams.client_id;
    const oidcClientConfig = this.tenantConfig.oidc_clients.find(client => client.client_id === clientId);

    if (!oidcClientConfig) {
      logger.error({ clientId }, 'OIDC client not found for the session');
      throw new Error('OIDC client not found for the session');
    }
    return oidcClientConfig;
  }

  async createAuthCode(sessionId: string) {
    const state = await this.sessionService.getSession(sessionId, this.tenantConfig.id);
    return this.createAuthCodeFromState(state);
  }

  async createAuthCodeFromState(state: AuthState) {
    this.validateStateForTokenCreation(state);
    const oidcClientConfig = this.getOidcConfig(state);
    const authCode = crypto.randomUUID();

    await this.redisClient.set(this.getAuthTokenKey(authCode), JSON.stringify(state), {
      EX: oidcClientConfig.session_expiration_time,
    });

    return authCode;
  }
}
