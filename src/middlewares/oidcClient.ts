import Elysia, { t, status, Static } from "elysia";
import { tenantMiddleware } from "@/middlewares/tenant";
import { userAuthState } from "@/middlewares/session/sessionMiddleware";

const querySchema = t.Object({
  client_id: t.Optional(t.String()),
})

export const oidcClientMiddleware = new Elysia({ name: 'oidcClient' })
  .use(tenantMiddleware)
  .use(userAuthState)
  .guard({
    schema: 'standalone',
    query: querySchema
  })
  .resolve(async ({ query, tenant, authState }) => {
    let { client_id } = query as Static<typeof querySchema>;

    if (authState.version === 1 && authState.auth.step !== 'idle') {
      client_id = authState.auth.state.authorizeParams.client_id;
    }

    let oidcClient = tenant.oidc_clients.find(client => client.client_id === client_id);
    if (oidcClient) {
      return { oidcClient };
    }

    return status(404, `OIDC client "${query.client_id}" not found`);
  }).as('scoped');