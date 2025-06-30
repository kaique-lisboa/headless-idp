import { Html, html } from '@elysiajs/html';
import Elysia, { status, t } from "elysia";
import { match, P } from "ts-pattern";
import { loggerMiddleware } from "@/core/logger";
import { userAuthState } from "@/middlewares/session/sessionMiddleware";
import { userAuthenticated, userCredsMatch } from "@/middlewares/session/sessionStateTransitions";
import { tenantMiddleware } from "@/middlewares/tenant";
import { KeycloakAuthService } from "@/services/keycloakAuthService";
import { redirectToRedirect } from "@/utils/redirects";
import { LoginPage } from "@/routes/pages/LoginPage";

export const v1LoginRouter = new Elysia({ name: 'v1LoginRouter', })
  .use(loggerMiddleware)
  .use(html())
  .group('/:tenantId/flow/v1', app => app
    .use(tenantMiddleware)
    .use(userAuthState)
    .get('/login', ({ authState, logger }) => {

      if (authState.version !== 1 || authState.auth.step !== 'initiate_login') {
        return status(400, {
          message: 'Invalid session state'
        })
      }

      return <LoginPage state={authState.auth} />;
    })
    .post('/login', async ({ authState, setAuthState, body, set, tenant }) => {

      return match(authState)
        // Matches with Valid state
        .with({ version: 1, auth: { step: P.union('initiate_login') } }, (authState) => {

          // Matches with Valid config
          return match(tenant)
            .with({ auth_provider: { type: 'keycloak' } }, async (tenant) => {
              const authService = new KeycloakAuthService(tenant);
              const [response, error] = await authService.passwordGrant(body.email, body.password)
                .then(token => [token, null] as const)
                .catch(err => [null, err] as const);

              if (error || !response) {
                set.status = 401;
                return <LoginPage state={authState.auth} error="Invalid credentials" />
              }

              const decoded = authService.decodeToken(response.access_token);

              const newState = await setAuthState({
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
                await setAuthState({
                  auth: userAuthenticated(
                    newState.auth
                  )
                });
              }

              return redirectToRedirect(tenant.id);
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

              const newState = await setAuthState({
                auth: userCredsMatch(
                  authState.auth, { enabled: false, type: 'none' }, {
                  email: user.email,
                  name: user.name,
                  id: user.id,
                  permissions: [], // TODO: Add permissions to the user
                }, null)
              });

              await setAuthState({
                auth: userAuthenticated(
                  newState.auth
                )
              });

              return redirectToRedirect(tenant.id);
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