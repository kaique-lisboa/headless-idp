import { PasswordGrantResponse } from "@/services/keycloakAuthService";

export type User = {
  id: string;
  name: string;
  email: string;
}

export type OAuthParams = {
  redirect_uri: string,
  scope: string,
  client_id: string,
  code_challenge: string,
  code_challenge_method: string,
}

export type UserIdentified = {
  user: User
}

export type MFA = {
  enabled: boolean,
  type: string,
}

export type AuthState = {
  version: 1,
  auth: AuthStateV1
}

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
    }
  }

  export type UserIdentified = {
    step: 'user_identified',
    state: {
      authorizeParams: OAuthParams,
      user: User,
    }
  }

  export type UserCredsMatch = {
    step: 'user_creds_match',
    state: {
      authorizeParams: OAuthParams,
      user: User,
      mfa: MFA,
      externalAuth: ExternalAuthState,
    }
  }

  export type UserAuthenticated = {
    step: 'user_authenticated',
    state: {
      authorizeParams: OAuthParams,
      user: User,
      mfa: MFA,
    }
  }
}

export type AuthStateV1 =
  | AuthStates.Idle
  | AuthStates.InitiateLogin
  | AuthStates.UserIdentified
  | AuthStates.UserCredsMatch
  | AuthStates.UserAuthenticated


