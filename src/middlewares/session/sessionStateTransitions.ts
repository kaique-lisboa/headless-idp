import { OAuthParams, AuthStates, User, MFA, ExternalAuthState, AuthState, AuthStateV1 } from "@/middlewares/session/sessionStates";

// Transition functions
export function initiateLogin(params: OAuthParams, tenantId: string): AuthStates.InitiateLogin {
  return {
    step: 'initiate_login',
    state: {
      authorizeParams: params,
      tenantId
    }
  };
}

export function updateAuthorizeParams<T extends AuthState<Exclude<AuthStateV1, AuthStates.Idle>>>(
  currentState: T,
  params: OAuthParams
): T {
  return {
    version: 1,
    auth: {
      ...currentState.auth,
      state: {
        ...currentState.auth.state,
        authorizeParams: params,
      }
    }
  } as T;
}

export function userIdentified(
  currentState: AuthStates.InitiateLogin,
  user: User
): AuthStates.UserIdentified {
  return {
    ...currentState,
    step: 'user_identified',
    state: {
      ...currentState.state,
      authorizeParams: currentState.state.authorizeParams,
      user
    }
  };
}

export function userIdentifiedCredsMatched(
  currentState: AuthStates.UserIdentified,
  mfa: MFA,
  externalAuth: ExternalAuthState = null
): AuthStates.UserCredsMatch {
  return {
    ...currentState,
    step: 'user_creds_match',
    state: {
      ...currentState.state,
      authorizeParams: currentState.state.authorizeParams,
      user: currentState.state.user,
      mfa,
      externalAuth
    }
  };
}

export function userCredsMatch(
  currentState: AuthStates.InitiateLogin,
  mfa: MFA,
  user: User,
  externalAuth: ExternalAuthState = null
): AuthStates.UserCredsMatch {
  return {
    step: 'user_creds_match',
    state: {
      ...currentState.state,
      authorizeParams: currentState.state.authorizeParams,
      user,
      mfa,
      externalAuth
    }
  };
}

export function userAuthenticated(
  currentState: AuthStates.UserCredsMatch
): AuthStates.UserAuthenticated {
  return {
    ...currentState,
    step: 'user_authenticated',
  };
}

export function resetToIdle(): AuthStates.Idle {
  return {
    step: 'idle'
  };
}
