import { AuthState, AuthStates } from "@/middlewares/session/sessionStates";
import { testTenantConfig } from "./configMock.test";

export const authenticatedState = {
  version: 1,
  auth: {
    state: {
      tenantId: testTenantConfig.id,
      authorizeParams: {
        redirect_uri: "http://localhost:3000/callback",
        scope: "openid profile email",
        client_id: "test-client",
        code_challenge: "test",
        code_challenge_method: "S256",
      },
      mfa: {
        enabled: false,
        type: "none",
      },
      user: {
        id: "1",
        name: "John Doe",
        email: "john.doe@example.com",
        permissions: [],
      },
      externalAuth: null,
    },
    step: 'user_authenticated' as const,
  } satisfies AuthStates.UserAuthenticated,
} satisfies AuthState