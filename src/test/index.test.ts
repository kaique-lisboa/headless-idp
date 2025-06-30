import { Elysia } from 'elysia';
import { describe, test, expect } from "@jest/globals";
import { mock } from 'bun:test';
import { redisClientMock } from './mocks/redisClientMock.test';
import { testTenantConfig } from './mocks/configMock.test';

mock.module("@/core/redis", () => {
  return {
    redisClient: redisClientMock,
    redisMiddleware: new Elysia({ name: 'redis' })
      .decorate('redisClient', redisClientMock)
  }
})

import app from "@/app";
import { createHash } from 'crypto';

describe("App", () => {
  test("should be able to login successfully in test tenant", async () => {

    const codeVerifier = "test_verifier"
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    const query = new URLSearchParams({
      client_id: testTenantConfig.oidc_clients[0].client_id,
      redirect_uri: testTenantConfig.oidc_clients[0].redirect_uris[0],
      response_type: "code",
      scope: "openid profile email",
      state: "test",
      code_challenge_method: "S256",
      code_challenge: codeChallenge
    });
    // Authorize
    const response = await app.handle(new Request(`http://localhost/${testTenantConfig.id}/authorize?${query.toString()}`));
    expect(response.status).toBe(302);
    const sessionId = response.headers.get("Set-Cookie")?.split(';')[0].split('=')[1];
    expect(sessionId).toBeDefined();
    let location = response.headers.get("Location");
    expect(location).toBe('/test/flow/v1/login');

    // Login
    const loginResponse = await app.handle(new Request(`http://localhost${location}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionId}`
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test'
      })
    }));
    expect(loginResponse.status).toBe(302);
    location = loginResponse.headers.get("Location");
    expect(location).toBe('/test/flow/v1/redirect');

    // Redirect
    const redirectResponse = await app.handle(new Request(`http://localhost${location}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionId}`
      },
    }));
    console.log(await redirectResponse.text());
    expect(redirectResponse.status).toBe(302);
    location = redirectResponse.headers.get("Location");
    expect(location).toContain(testTenantConfig.oidc_clients[0].redirect_uris[0]);
    const code = new URLSearchParams(location?.split('?')[1]).get('code');
    expect(code).toBeDefined();

    // Token
    const tokenResponse = await app.handle(new Request(`http://localhost/${testTenantConfig.id}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier
      })
    }));
    const token = await tokenResponse.json();
    expect(tokenResponse.status).toBe(200);
    expect(token.access_token).toBeDefined();
    expect(token.id_token).toBeDefined();
    expect(token.expires_in).toBe(testTenantConfig.oidc_clients[0].jwt_expiration_time);
    expect(token.token_type).toBe('Bearer');
  });
});