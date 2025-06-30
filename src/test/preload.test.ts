import { mock } from "bun:test"
import { configMock } from "./mocks/configMock.test"

mock.module("@/core/config", () => {
  return {
    config: configMock,
  }
})