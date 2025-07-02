import Elysia, { status } from "elysia";
import { loggerMiddleware } from "@/core/logger";
import { sessionMiddleware } from "@/services/sessionService";
import { AuthState } from "@/middlewares/session/sessionStates";
import { tenantMiddleware } from "@/middlewares/tenant";
import { AppError } from "@/core/errors";

export const session = new Elysia({ name: 'session' })
  .use(loggerMiddleware)
  .use(tenantMiddleware)
  .resolve(async ({ cookie, logger, tenant }) => {
    let session = cookie["session"];
    if (!session.value) {
      logger.info('No session found, creating new one');
      session.value = crypto.randomUUID();
      session.httpOnly = true;
      session.secure = true;
      session.sameSite = "strict";
      session.path = `/${tenant.id}`;
      session.maxAge = 60 * 60 * 24 * 30;
    }

    return {
      sessionId: session.value
    };
  }).as('scoped');

/**
 * Must be used within a tenant group
 */
export const userAuthState = new Elysia({ name: 'userAuthState' })
  .use(session)
  .use(sessionMiddleware)
  .use(tenantMiddleware)
  .resolve(async ({ sessionId, sessionService, tenant, getOidcClient, query }) => {
    try {
      const authState = await sessionService.getSession(sessionId, tenant.id)
      return {
        authState,
        setAuthState: async <T extends Partial<AuthState>>(state: T, expiresIn?: number) => {
          await sessionService.setSession(sessionId, state, expiresIn);
          return state;
        }
      }
    } catch (e) {
      if (e instanceof AppError) {
        return status(e.status, {
          message: e.message
        })
      }
      return status(500, {
        message: 'Internal server error'
      })
    };
  }).as('scoped');

