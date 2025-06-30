import { TokenService } from "../services/oauthOidcService";
import { configMock, testTenantConfig } from "./mocks/configMock.test";
import { RedisClientType } from "@redis/client";
import { redisClientMock, asRedisClient } from "./mocks/redisClientMock.test";
import { authenticatedState } from "./mocks/authStateMocks.test";
import { createHash } from "crypto";
import { SessionService } from "@/services/sessionService";

describe("oidcService", () => {

  let oidcService: TokenService;
  let redisClient: RedisClientType;

  beforeEach(() => {
    redisClient = asRedisClient(redisClientMock);
    oidcService = new TokenService(
      testTenantConfig,
      configMock,
      redisClient,
      new SessionService(redisClient, configMock)
    );
  });

  test("should be able to create a new auth code", async () => {
    const state = authenticatedState;
    const sessionId = crypto.randomUUID();
    await redisClient.set('session:' + sessionId, JSON.stringify(state));
    const code = await oidcService.createAuthCode(sessionId);
    expect(code).toBeDefined();
  });

  test("should be able to generate a valid token from an authenticated state", async () => {
    const state = authenticatedState;
    state.auth.state.authorizeParams.code_challenge = createHash("sha256")
      .update("verifier-test")
      .digest("base64url");
    await redisClient.set('oidc:session_snapshot_by_code:test-code', JSON.stringify(state));
    const token = await oidcService.createToken(
      "test-code",
      "verifier-test"
    );
    expect(token).toBeDefined();
  });

});