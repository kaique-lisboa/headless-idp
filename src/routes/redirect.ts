import Elysia from "elysia";
import { redirect, status } from "elysia";
import { match } from "ts-pattern";
import { TokenService, } from "@/services/oauthOidcService";
import { oidcClientMiddleware } from "@/middlewares/oidcClient";
import { userAuthState } from "@/middlewares/session/sessionMiddleware";

export const v1RedirectRouter = new Elysia({ name: 'v1RedirectRouter', prefix: '' })
  .group('/:tenantId/flow/v1', app => app
    .use(oidcClientMiddleware)
    .use(userAuthState)
    .get('/redirect', async ({ authState, logger, oidcClient, sessionId, tenant }) => {
      return match(authState)
        .with({ version: 1, auth: { step: 'user_authenticated' } }, async ({ auth }) => {
          const oidcService = new TokenService(tenant);
          const authCode = await oidcService.createAuthCode(sessionId);
          const redirectUrl = `${auth.state.authorizeParams.redirect_uri}?code=${authCode}`;
          return redirect(redirectUrl, 302);
        })
        .otherwise(() => {
          logger.debug({ authState }, 'Invalid session state');
          return status(400, { message: 'Invalid session state' })
        })
    }))