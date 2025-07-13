import { Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import dotenv from 'dotenv';
import pupa, { MissingValueError } from 'pupa';
import { logger } from "@/core/logger";
import { t } from "elysia";

dotenv.config();

const OauthPassGrantAuthProviderSchema = t.Object({
  type: t.Literal('oauth_password_grant'),
  url: t.String(),
  client_id: t.String(),
  client_secret: t.String(),
})

const TestAuthProviderSchema = t.Object({
  type: t.Literal('test'),
  users: t.Array(t.Object({
    name: t.String(),
    username: t.String(),
    password: t.String(),
    email: t.String(),
    id: t.String(),
  })),
})

const CognitoAuthProviderSchema = t.Object({
  type: t.Literal('cognito'),
  region: t.String(),
  user_pool_id: t.String(),
  client_id: t.String(),
  client_secret: t.String(),
})

const baseConfigSchema = t.Object({
  redis: t.Object({
    url: t.String(),
  }),
  port: t.Number(),
  hostname: t.String(),
  tenants: t.Array(t.Object({
    id: t.String(),
    name: t.String(),
    enabled: t.Boolean(),
    oidc_config: t.Object({
      jwt_secret: t.String(),
    }),
    auth_provider: t.Union([
      OauthPassGrantAuthProviderSchema,
      TestAuthProviderSchema,
      CognitoAuthProviderSchema,
    ]),
    oidc_clients: t.Array(t.Object({
      client_id: t.String(),
      client_secret: t.String(),
      allowed_scopes: t.Array(t.String()),
      redirect_uris: t.Array(t.String()),
      session_expiration_time: t.Number(),
      code_expiration_time: t.Number(),
      jwt_expiration_time: t.Number(),
    })),
  })),
})

const configUnparsed = await import('config').then(e => JSON.stringify(e.default.util.toObject()));

let configWithEnvs: string;
try {
  configWithEnvs = pupa(configUnparsed, process.env);
} catch (e) {
  if (e instanceof MissingValueError) {
    logger.error(`Missing environment variable '${e.key}'`);
    process.exit(1);
  } else {
    throw e;
  }
}

export const config = Value.Parse(baseConfigSchema, JSON.parse(configWithEnvs));
export type Config = Static<typeof baseConfigSchema>
export type TenantConfig = Config['tenants'][number]
export type OidcClientConfig = TenantConfig['oidc_clients'][number]
export type AuthProviderConfig = TenantConfig['auth_provider']
export type AWSCognitoAuthProviderConfig = Static<typeof CognitoAuthProviderSchema>
