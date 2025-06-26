import Elysia, { status, t } from "elysia";
import { loggerMiddleware } from "@/core/logger";
import { oidcClientMiddleware } from "@/middlewares/oidcClient";
import { OidcService } from "@/services/oidcService";

export const tokenRouter = new Elysia({ name: 'tokenRouter' })
  .use(loggerMiddleware)
  .group('/:tenantId', app => app
    .use(oidcClientMiddleware)
    .post('/token', async ({ body: { code, code_verifier }, oidcClient, tenant }) => {
      const oidcService = new OidcService(tenant, oidcClient);
      const [token, error] = await oidcService.createAccessToken(code, code_verifier)
        .then(token => [token, null] as const)
        .catch(err => [null, err] as const);

      if (error) {
        return status(400, { message: error.message });
      }

      return {
        token,
      }
    }, {
      body: t.Object({
        code: t.String(),
        grant_type: t.Literal('authorization_code'),
        code_verifier: t.String(),
      })
    }))