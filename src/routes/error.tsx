import { userAuthState } from "@/middlewares/session/sessionMiddleware";
import { tenantMiddleware } from "@/middlewares/tenant";
import { Html, html } from "@elysiajs/html";
import Elysia from "elysia";
import { ErrorPage } from "./pages/ErrorPage";

export const v1ErrorRouter = new Elysia()
  .use(html())
  .group('/:tenantId/v1/flow', app => app
    .use(tenantMiddleware)
    .use(userAuthState)
    .get('/error', ({ logger }) => {
      logger.error('Invalid session state');
      return <ErrorPage error="Invalid session state" />
    })
  )