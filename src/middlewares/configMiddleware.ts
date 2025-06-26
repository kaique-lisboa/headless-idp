import Elysia from "elysia";
import { config } from "@/core/config";

export const configMiddleware = new Elysia({ name: 'configMiddleware' })
  .resolve(async () => {
    return { config };
  })
  .as('scoped');