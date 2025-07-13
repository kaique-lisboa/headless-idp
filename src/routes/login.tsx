import { Html, html } from '@elysiajs/html';
import Elysia, { status, t } from "elysia";
import { match, P } from "ts-pattern";
import { loggerMiddleware } from "@/core/logger";
import { userAuthState } from "@/middlewares/session/sessionMiddleware";
import { userAuthenticated, userCredsMatch } from "@/middlewares/session/sessionStateTransitions";
import { tenantMiddleware } from "@/middlewares/tenant";
import { OauthPassGrantAuthService } from "@/services/PasswordGrantAuthService";
import { redirectToV1Login, redirectToV1Mfa, redirectWithError, redirectWithSuccess } from "@/utils/redirects";
import { LoginPage } from "@/routes/pages/LoginPage";
import { AuthState, AuthStates } from '@/middlewares/session/sessionStates';
import { AwsCognitoService } from '@/services/AwsCognitoService';

export const v1LoginRouter = new Elysia({ name: 'v1LoginRouter', })
  .use(loggerMiddleware)
  .use(html())
  .group('/:tenantId/v1/flow', app => app
    .use(tenantMiddleware)
    .use(userAuthState)
    .get('/login', ({ requestAuthState: authState }) => {

      return match(authState)
        .with({ version: 1, auth: { step: 'idle' } }, () => status(400, {
          message: 'Invalid session state'
        }))
        .otherwise(() => <LoginPage state={authState.auth} />)

    })
    .post('/login', async ({ requestAuthState: authState, setAuthState, body, set, tenant }) => {

      return match(authState)
        // Matches with Valid state
        .with({ version: 1, auth: { step: P.union('initiate_login') } }, (authState) => {

          // Matches with Valid config
          return match(tenant)
            .with({ auth_provider: { type: 'oauth_password_grant' } }, async (tenant) => {
              const authService = new OauthPassGrantAuthService(tenant);
              const [response, error] = await authService.passwordGrant(body.email, body.password)
                .then(token => [token, null] as const)
                .catch(err => [null, err] as const);

              if (error || !response) {
                set.status = 401;
                return <LoginPage state={authState.auth} error="Invalid credentials" />
              }

              const decoded = authService.decodeToken(response.access_token);

              let newState: AuthState<AuthStates.UserCredsMatch | AuthStates.UserAuthenticated> = await setAuthState({
                auth: userCredsMatch(
                  authState.auth, { enabled: false, type: 'none' }, {
                  email: decoded.email,
                  name: decoded.name,
                  id: decoded.sub,
                  permissions: decoded.scope.split(' '),
                }, {
                  provider: 'keycloak',
                  type: 'oidc',
                  passwordGrant: response
                })
              });

              if (true) { // Validate if there's more to do with that user such as validate MFA
                newState = await setAuthState({
                  auth: userAuthenticated(
                    newState.auth as AuthStates.UserCredsMatch
                  )
                });
              } else {
                return redirectToV1Mfa(tenant.id);
              }

              return await redirectWithSuccess(tenant, newState);
            })
            .with({ auth_provider: { type: 'test' } }, async (config) => {

              let { email, password } = body;

              email = email.toLowerCase().trim();
              password = password.trim();

              const user = config.auth_provider.users
                .find(user => user.email === email && user.password === password);
              if (!user) {
                return status(401, {
                  message: 'Invalid credentials'
                })
              }

              const credsMatchState = await setAuthState({
                auth: userCredsMatch(
                  authState.auth, { enabled: false, type: 'none' }, {
                  email: user.email,
                  name: user.name,
                  id: user.id,
                  permissions: [], // TODO: Add permissions to the user
                }, null)
              });

              const newState = await setAuthState({
                auth: userAuthenticated(
                  credsMatchState.auth
                )
              });

              return redirectWithSuccess(tenant, newState);
            })
            .with({ auth_provider: { type: 'cognito' } }, async (tenant) => {
              const cognitoService = new AwsCognitoService(tenant);
              const authResponse = await cognitoService.authenticate(body.email, body.password);



              let newState: AuthState = authState;
              switch(authResponse.type) {
                case 'authenticated':

                  if(!authResponse.authenticationResult.IdToken || !authResponse.authenticationResult.AccessToken) {
                    return redirectWithError(tenant, authState, 'No tokens returned');
                  }

                  const idTokenPayload = cognitoService.decodeIdToken(authResponse.authenticationResult.IdToken);
                  //const accessTokenPayload = cognitoService.decodeAccessToken(authResponse.authenticationResult.AccessToken);
                  newState = await setAuthState({
                    auth: userCredsMatch(
                      authState.auth,
                      { enabled: false, type: 'none' },
                      {
                        email: idTokenPayload.email ?? '',
                        name: idTokenPayload.name ?? '',
                        id: idTokenPayload.sub,
                        permissions: [],
                      },
                      {
                        provider: 'cognito',
                        type: 'cognito',
                        cognito: authResponse,
                      }
                    )
                  });

                  newState = await setAuthState({
                    auth: userAuthenticated(
                      newState.auth as AuthStates.UserCredsMatch
                    )
                  });
                  return redirectWithSuccess(tenant, newState as AuthState<AuthStates.UserAuthenticated>);
                case 'challenge':
                  return redirectToV1Mfa(tenant.id);
                case 'error':
                  set.status = 401;
                  return <LoginPage state={authState.auth} error={authResponse.exception?.message ?? 'Unknown error'} />
              }
            })
            .exhaustive()

        })
        .otherwise(() => status(400, {
          message: 'Invalid session state'
        }))
    }, {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      })
    }))


