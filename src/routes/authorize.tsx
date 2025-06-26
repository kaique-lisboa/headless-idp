import { Html, html } from '@elysiajs/html';
import Elysia, { status, t } from "elysia";
import { match, P } from "ts-pattern";
import { configMiddleware } from "@/middlewares/configMiddleware";
import { oidcClientMiddleware } from "@/middlewares/oidcClient";
import { userAuthState } from "@/middlewares/session/sessionMiddleware";
import { initiateLogin } from "@/middlewares/session/sessionStateTransitions";
import { redirectToLogin, redirectToRedirect } from "@/utils/redirects";
import { ErrorPage } from "@/routes/pages/ErrorPage";

export const authRouter = new Elysia()
  .use(configMiddleware)
  .use(html())
  .group('/:tenantId', app => app
    .use(oidcClientMiddleware)
    .use(userAuthState)
    .get('/authorize', async ({ authState, setAuthState, query, set, logger, oidcClient, tenant }) => {

      logger.info({ query }, 'Authorization initiated');
      if (!oidcClient.redirect_uris.includes(query.redirect_uri)) {
        return status(400, {
          message: `Invalid redirect URI: ${query.redirect_uri}, not allowed for the client ${query.client_id}`
        })
      }

      let state = authState;

      logger.info({ step: authState.auth.step }, 'initiating login');


      return match(state)
        .with({ version: 1, auth: { step: P.union('initiate_login', 'idle') } }, async () => {

          await setAuthState({
            version: 1,
            auth: initiateLogin(query),
          }, oidcClient.session_expiration_time);

          return redirectToLogin(tenant.id);
        })
        .with({ version: 1, auth: { step: 'user_creds_match' } }, async (authState) => {


          await setAuthState({
            version: 1,
            auth: {
              ...authState.auth,
              state: {
                ...authState.auth.state,
                authorizeParams: query,
              }
            }
          });

          return match(query.prompt)
            .with('login', async () => {
              await setAuthState(
                {
                  version: 1,
                  auth: initiateLogin(query)
                }
              );
              return redirectToLogin(tenant.id);
            })
            .with('consent', () => {
              // TODO: Implement select account flow
              return status(422, {
                message: 'Unsupported prompt: consent'
              })
            })
            .with('select_account', () => {
              // TODO: Implement select account flow
              return status(422, {
                message: 'Unsupported prompt: select_account'
              })
            })
            .otherwise(() => {
              return redirectToRedirect(tenant.id);
            })
        })
        .otherwise((state) => {
          logger.error({ step: state.auth.step }, 'Invalid session step or version');
          set.status = 400;
          return <ErrorPage error="Invalid session state" />
        })

    }, {
      query: t.Object({
        redirect_uri: t.String(),
        client_id: t.String(),
        scope: t.String(),
        response_type: t.Literal('code'),
        code_challenge: t.String(),
        code_challenge_method: t.Literal('S256'),
        prompt: t.Optional(t.Union([
          t.Literal('none'),
          t.Literal('login'),
          t.Literal('consent'),
          t.Literal('select_account'),
        ])),
      })
    })
  );