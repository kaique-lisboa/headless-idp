import { configMiddleware } from "@/middlewares/configMiddleware";
import { oidcClientMiddleware } from "@/middlewares/oidcClient";
import { userAuthState } from "@/middlewares/session/sessionMiddleware";
import { initiateLogin, updateAuthorizeParams } from "@/middlewares/session/sessionStateTransitions";
import { redirectToV1Error, redirectToV1Login, redirectWithError, redirectWithSuccess } from "@/utils/redirects";
import { html } from '@elysiajs/html';
import Elysia, { status, t } from "elysia";
import { match, P } from "ts-pattern";

export const v1AuthRouter = new Elysia()
  .use(configMiddleware)
  .use(html())
  .group('/:tenantId/v1', app => app
    .use(oidcClientMiddleware)
    .use(userAuthState)
    .get('/authorize', async ({ requestAuthState, setAuthState, query, set, logger, oidcClient, tenant }) => {

      logger.info({ query }, 'Authorization initiated');
      if (!oidcClient.redirect_uris.includes(query.redirect_uri)) {
        return status(400, {
          message: `Invalid redirect URI: ${query.redirect_uri}, not allowed for the client ${query.client_id}`
        })
      }

      logger.info({ step: requestAuthState.auth.step }, 'initiating login');

      return match(requestAuthState)
        .with({ version: 1, auth: { step: P.union('initiate_login', 'idle') } }, async (state) => {
          await setAuthState({
            version: 1,
            auth: initiateLogin(query, tenant.id),
          }, oidcClient.session_expiration_time);

          return match(query.prompt)
            .with('none', () => redirectWithError(tenant, state, 'interaction_required'))
            .otherwise(() => redirectToV1Login(tenant.id));
        })
        .with({ version: 1, auth: { step: 'user_authenticated' } }, async (authState) => {
          const newState = await setAuthState(updateAuthorizeParams(authState, query));

          return match(query.prompt)
            .with('login', async () => {
              return redirectToV1Login(tenant.id);
            })
            // .with('consent', () => {
            //   // TODO: Implement consent account flow
            //   return status(422, {
            //     message: 'Unsupported prompt: consent'
            //   })
            // })
            // .with('select_account', () => {
            //   // TODO: Implement select account flow
            //   return status(422, {
            //     message: 'Unsupported prompt: select_account'
            //   })
            // })
            .otherwise(() => {
              return redirectWithSuccess(tenant, newState);
            })
        })
        .otherwise((state) => {
          logger.error({ step: state.auth.step }, 'Invalid session step or version');
          set.status = 400;
          return redirectToV1Error(tenant.id);
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