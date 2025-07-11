import Elysia, { status, t } from "elysia";
import { configMiddleware } from "@/middlewares/configMiddleware";

export const tenantMiddleware = new Elysia({ name: 'tenant' })
  .use(configMiddleware)
  .guard({
    params: t.Object({
      tenantId: t.String(),
    })
  }).resolve(async ({ params: { tenantId }, config }) => {

    const tenant = config.tenants.find(tenant => tenant.id === tenantId);
    if (!tenant || !tenant.enabled) {
      return status(404, 'Tenant not found');
    }

    const getOidcClient = (clientId: string) => {
      return tenant.oidc_clients.find(client => client.client_id === clientId);
    }

    return { tenant, getOidcClient };
  }).as('scoped');