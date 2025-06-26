import Elysia from "elysia";
import { createClient } from "@redis/client";
import { config, Config } from "@/core/config";
import { logger } from "@/core/logger";

export async function createRedisClient(config: Config) {
  logger.info("attempting to connect to redis");
  const client = await createClient({
    url: config.redis.url,
  })
    .on("error", (err) => logger.error({ message: "Redis Client Error", err }))
    .on("connect", () => logger.info("Redis Client Connected"))
    .connect();

  return client;
}

export const redisClient = await createRedisClient(config);

export const redisMiddleware = new Elysia({ name: 'redis' })
  .decorate('redisClient', redisClient)