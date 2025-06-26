import { OAuthParams, AuthStates, User, MFA, ExternalAuthState } from "@/middlewares/session/sessionStates";

// Transition functions
export function initiateLogin(params: OAuthParams): AuthStates.InitiateLogin {
  return {
    step: 'initiate_login',
    state: {
      authorizeParams: params
    }
  };
}

export function userIdentified(
  currentState: AuthStates.InitiateLogin,
  user: User
): AuthStates.UserIdentified {
  return {
    step: 'user_identified',
    state: {
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
    step: 'user_creds_match',
    state: {
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
    step: 'user_authenticated',
    state: {
      authorizeParams: currentState.state.authorizeParams,
      user: currentState.state.user,
      mfa: currentState.state.mfa
    }
  };
}

export function resetToIdle(): AuthStates.Idle {
  return {
    step: 'idle'
  };
}
