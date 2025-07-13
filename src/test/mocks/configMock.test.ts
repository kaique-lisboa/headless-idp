import { TenantConfig, type Config } from "@/core/config";


export const keycloakTenantConfig = {
  "id": "default",
  "name": "Default Tenant",
  "enabled": true,
  "oidc_config": {
    "jwt_secret": "test"
  },
  "auth_provider": {
    "type": "oauth_password_grant",
    "url": "http://localhost:8080",
    "client_id": "test",
    "client_secret": "test"
  },
  "oidc_clients": [
    {
      "client_id": "webapp-client",
      "client_secret": "test",
      "redirect_uris": [
        "https://default.com/callback"
      ],
      "allowed_scopes": [
        "openid",
        "email",
        "profile"
      ],
      "session_expiration_time": 20000,
      "code_expiration_time": 20000,
      "jwt_expiration_time": 20000
    }
  ]
} as const satisfies TenantConfig;

export const testTenantConfig = {
  "id": "test",
  "name": "Test Tenant",
  "enabled": true,
  "oidc_config": {
    "jwt_secret": "test"
  },
  "auth_provider": {
    "type": "test",
    "users": [
      {
        "name": "Test User",
        "username": "test",
        "email": "test@test.com",
        "password": "test",
        "id": "test_id"
      },
      {
        "name": "John Doe",
        "email": "john@doe.com",
        "username": "john",
        "password": "password123",
        "id": "john_id"
      }
    ]
  },
  "oidc_clients": [
    {
      "client_id": "test-client",
      "client_secret": "test-secret",
      "redirect_uris": [
        "https://test.com/callback"
      ],
      "allowed_scopes": [
        "openid",
        "email",
        "profile"
      ],
      "session_expiration_time": 20000,
      "code_expiration_time": 20000,
      "jwt_expiration_time": 20000
    }
  ]
} as const satisfies TenantConfig

export const configMock = {
  tenants: [
    keycloakTenantConfig,
    testTenantConfig
  ],
  redis: {
    url: "redis://localhost:6379",
  },
  port: 3000,
  hostname: "localhost",
} as const satisfies Config
