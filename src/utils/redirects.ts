import { OidcClientConfig, TenantConfig } from "@/core/config";
import { AuthState, AuthStates, AuthStateV1 } from "@/middlewares/session/sessionStates";
import { OauthOIDCService } from "@/services/OauthOidcService";
import { redirect } from "elysia";
import { match } from "ts-pattern";

export const redirectToV1Login = (tenantId: string) => {
  return redirect(`/${tenantId}/v1/flow/login`, 302);
}

export const redirectToClient = (redirectUri: string, params: Record<string, string>) => {
  return redirect(`${redirectUri}?${new URLSearchParams(params).toString()}`, 302);
}

export const redirectToV1Mfa = (tenantId: string) => {
  return redirect(`/${tenantId}/v1/flow/mfa`, 302);
}
export async function redirectWithSuccess(tenant: TenantConfig, authState: AuthState<AuthStates.UserCredsMatch | AuthStates.UserAuthenticated>) {
  const oidcService = new OauthOIDCService(tenant);
  const authCode = await oidcService.createAuthCodeFromState(authState);

  const params = Object.fromEntries([
    ['code', authCode],
    ['state', authState.auth.state.authorizeParams.state ?? undefined],
  ].filter(([_, value]) => value !== undefined));

  return redirectToClient(authState.auth.state.authorizeParams.redirect_uri, params);
}

export const redirectToV1Error = (tenantId: string) => {
  return redirect(`/${tenantId}/v1/flow/error`, 302);
}

export async function redirectWithError(
  tenant: TenantConfig,
  authState: AuthState<Exclude<AuthStateV1, AuthStates.UserCredsMatch | AuthStates.UserAuthenticated>>,
  error: string,
) {
  if (authState.auth.step === 'initiate_login' || authState.auth.step === 'idle') {
    return redirectToV1Error(tenant.id);
  }

  const params = Object.fromEntries([
    ['error', error],
    ['state', authState.auth.state.authorizeParams.state ?? undefined],
  ].filter(([_, value]) => value !== undefined));

  return redirectToClient(authState.auth.state.authorizeParams.redirect_uri, params);
}