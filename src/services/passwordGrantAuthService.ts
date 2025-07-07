import { createLogger } from "@/core/logger";
import { Config } from "@/core/config";
import { t, Static, } from "elysia";
import { Value } from "@sinclair/typebox/value";
import * as jose from 'jose';

export const PasswordGrantResponseSchema = t.Object({
  access_token: t.String(),
  expires_in: t.Number(),
  refresh_expires_in: t.Number(),
  refresh_token: t.String(),
  token_type: t.String(),
  "not-before-policy": t.Number(),
  session_state: t.String(),
  scope: t.String()
});

export type PasswordGrantResponse = Static<typeof PasswordGrantResponseSchema>;

export interface KeycloakToken {
  exp: number;
  iat: number;
  jti: string;
  iss: string;
  aud: string;
  sub: string;
  typ: string;
  azp: string;
  sid: string;
  acr: string;
  "allowed-origins": string[];
  realm_access: RealmAccess;
  resource_access: ResourceAccess;
  scope: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
}

export interface RealmAccess {
  roles: string[];
}

export interface ResourceAccess {
  account: RealmAccess;
}

export class OauthPassGrantAuthService {

  private url: string;
  private clientId: string;
  private clientSecret: string;

  constructor(
    readonly tenant: Config['tenants'][number],
    private readonly logger = createLogger('KeycloakAuthService')
  ) {

    if (tenant.auth_provider.type !== 'oauth_password_grant') {
      throw new Error('Password grant auth provider not configured');
    }

    this.url = tenant.auth_provider.url;
    this.clientId = tenant.auth_provider.client_id;
    this.clientSecret = tenant.auth_provider.client_secret;
  }

  async passwordGrant(username: string, password: string) {
    const response = await fetch(this.url, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username,
        password,
      }),
    });

    const data = await response.json();

    if (response.status !== 200) {
      this.logger.error({ data }, 'Password grant failed');
      throw new Error('Password grant failed');
    }

    try {
      const validatedData = Value.Parse(PasswordGrantResponseSchema, data);
      return validatedData;
    } catch (error) {
      this.logger.error({ data }, 'Password grant failed');
      throw new Error('Password grant returned invalid response');
    }
  }

  decodeToken(token: string) {
    return jose.decodeJwt(token) as KeycloakToken;
  }
}