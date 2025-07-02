import { Elysia } from 'elysia';
import { mock } from "bun:test"
import { configMock } from "./mocks/configMock.test"
import { redisClientMock } from "./mocks/redisClientMock.test"

mock.module("@/core/config", () => {
  return {
    config: configMock,
  }
})

mock.module("@/core/redis", () => {
  return {
    redisClient: redisClientMock,
    redisMiddleware: new Elysia({ name: 'redis' })
      .decorate('redisClient', redisClientMock)
  }
})
