import { PasswordGrantResponse } from "@/services/passwordGrantAuthService";

export type User = {
  id: string;
  name: string;
  email: string;
  permissions: string[];
}

export type OAuthParams = {
  redirect_uri: string,
  scope: string,
  client_id: string,
  code_challenge: string,
  code_challenge_method: string,
  state?: string,
}

export type UserIdentified = {
  user: User
}

export type MFA = {
  enabled: boolean,
  type: string,
}

export type AuthState<T extends AuthStateV1 = AuthStateV1> = {
  version: 1,
  auth: T
}

export type TokenEligibleState = AuthState & { auth: AuthStates.UserAuthenticated }

export type ExternalAuthState = {
  provider: 'keycloak',
  type: 'oidc',
  passwordGrant: PasswordGrantResponse,
} | null

export namespace AuthStates {
  export type Idle = {
    step: 'idle',
  }

  export type InitiateLogin = {
    step: 'initiate_login',
    state: {
      authorizeParams: OAuthParams,
      tenantId: string,
    }
  }

  export type UserIdentified = {
    step: 'user_identified',
    state: {
      authorizeParams: OAuthParams,
      user: User,
      tenantId: string,
    }
  }

  export type UserCredsMatch = {
    step: 'user_creds_match',
    state: {
      authorizeParams: OAuthParams,
      user: User,
      mfa: MFA,
      externalAuth: ExternalAuthState,
      tenantId: string,
    }
  }

  export type UserAuthenticated = {
    step: 'user_authenticated',
    state: {
      authorizeParams: OAuthParams,
      user: User,
      mfa: MFA,
      externalAuth: ExternalAuthState,
      tenantId: string,
    }
  }
}

export type AuthStateV1 =
  | AuthStates.Idle
  | AuthStates.InitiateLogin
  | AuthStates.UserIdentified
  | AuthStates.UserCredsMatch
  | AuthStates.UserAuthenticated


