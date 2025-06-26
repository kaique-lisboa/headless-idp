import pino from "pino";
import Elysia from "elysia";

export const logger = pino({
  level: "debug",
});

export function createLogger(name: string) {
  return pino({
    level: "debug",
    name,
  });
}

export const loggerMiddleware = new Elysia({ name: 'logger' })
  .decorate('logger', logger)