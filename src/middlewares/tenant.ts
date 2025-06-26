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
    if (!tenant) {
      return status(404, 'Tenant not found');
    }
    return { tenant };
  }).as('scoped');