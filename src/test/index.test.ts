import { Elysia } from 'elysia';
import { mock, describe, test, expect, beforeEach } from 'bun:test';
import { redisClientMock } from './mocks/redisClientMock.test';
import { testTenantConfig } from './mocks/configMock.test';
import { sessionService } from '@/services/sessionService';

import app from "@/app";
import { createHash } from 'crypto';
import { authenticatedState } from './mocks/authStateMocks.test';

describe("App", () => {

  beforeEach(() => {
    redisClientMock.clear();
  });

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

  test("should skip login if user is already authenticated", async () => {
    const sessionId = crypto.randomUUID();
    await sessionService.setSession(sessionId, authenticatedState, testTenantConfig.oidc_clients[0].session_expiration_time)

    const codeVerifier = "test_verifier"
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    const query = new URLSearchParams({
      client_id: testTenantConfig.oidc_clients[0].client_id,
      redirect_uri: testTenantConfig.oidc_clients[0].redirect_uris[0],
      response_type: "code",
      scope: "openid profile email",
      state: "test",
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
    });

    const response = await app.handle(new Request(`http://localhost/${testTenantConfig.id}/authorize?${query.toString()}`, {
      headers: {
        'Cookie': `session=${sessionId}`
      }
    }));
    expect(response.status).toBe(302);
    let location = response.headers.get("Location");
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

  })

  test("should only allow redirect url registered for the client", async () => {
    const query = new URLSearchParams({
      client_id: testTenantConfig.oidc_clients[0].client_id,
      redirect_uri: "http://localhost/not-allowed/callback",
      response_type: "code",
      scope: "openid profile email",
      state: "test",
      code_challenge_method: "S256",
      code_challenge: "ANYTHING",
    });

    const response = await app.handle(new Request(`http://localhost/${testTenantConfig.id}/authorize?${query.toString()}`));
    expect(response.status).toBe(400);
  });
});