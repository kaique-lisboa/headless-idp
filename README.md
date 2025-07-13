# Headless IDP

A basic, FOSS, Identity Provider for you to use however you want!

## Why?

Many companies rely on managed IDPs to fulfill their need for secure user authentication. Products like AWS Cognito and Microsoft Entra provide both customizable hosted UIs and headless APIs, allowing companies to implement their own UI.

The problem with this approach is that customization is often limited or unavailable, restricting what companies can build (and frequently leading to hacky solutions that compromise user experience).

This project should be perceived as the "shadcn" of IDPs: you own the code, you can change whatever you want (at your own risk), and you have full control. Still, out of the box, you'll have everything you need for common use cases.


## Requirements

### System
- **Bun**: JavaScript/TypeScript runtime (recommended)
- **Docker**: To run auxiliary services (Keycloak, Redis, PostgreSQL)

### External Services
- **Redis**: For session storage
- **Keycloak**: As authentication provider (optional)
- **PostgreSQL**: Database for Keycloak and (in future) for the internal user management

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd idp
```

2. Install dependencies:
```bash
bun install
```

3. Set up auxiliary services using Docker:
```bash
docker-compose up -d
```

4. Create .env based on .env.example

5. (optional) Set up your keycloak realm on `http://localhost:8080`. The default credentials are:
   - Username: `admin`
   - Password: `admin`

> Make sure to create a realm, a client and enable password grant

6. Authenticate on one of the tenants:
- Keycloak (needs to configure the realm): `http://localhost:3000/default/v1/authorize?redirect_uri=https%3A%2F%2Fhttpbin.org%2Fget&client_id=webapp-client&scope=email&response_type=code&code_challenge=n4bQgYhMfWWaL%2BqgxVrQFaO%2FTxsrC4Is0V1sFbDwCgg%3D&code_challenge_method=S256&prompt=login`
- cognito: `http://localhost:3000/cognito/v1/authorize?redirect_uri=https%3A%2F%2Fhttpbin.org%2Fget&client_id=webapp-client&scope=email&response_type=code&code_challenge=n4bQgYhMfWWaL%2BqgxVrQFaO%2FTxsrC4Is0V1sFbDwCgg%3D&code_challenge_method=S256&prompt=login`
- test: `http://localhost:3000/cognito/v1/authorize?redirect_uri=https%3A%2F%2Fhttpbin.org%2Fget&client_id=webapp-client&scope=email&response_type=code&code_challenge=n4bQgYhMfWWaL%2BqgxVrQFaO%2FTxsrC4Is0V1sFbDwCgg%3D&code_challenge_method=S256`

7. Insert user and pass: test@test.com:test

## Configuration

This project uses

The main configuration file is located at `config/default.yaml`. 

> Interpolate env variables in config using {VAR_NAME}

### Main Settings:

- **Server port**: `port: 3000`
- **Redis**: `redis.url: "redis://localhost:6379"`
- **Tenants**: Configure multiple tenants with different authentication providers

### Tenant configuration example:
```yaml
tenants:
  - id: "default"
    name: "Default Tenant"
    auth_provider:
      type: "keycloak"
      url: "http://localhost:8080"
      realm: "test"
      client_id: "test"
      client_secret: "your-client-secret"
```

## How to Run

### Development
```bash
# Start the server in development mode with hot-reload
bun run dev
```

### Configuration Test
```bash
# Validate current configuration
bun run testConfig
```

### Build
```bash
# Validate current configuration
bun run build
```

## Available Services

After running `docker-compose up -d`, the following services will be available:

- **IDP Server**: http://localhost:3000
- **Keycloak**: http://localhost:8080 (admin/admin)
- **Grafana**: http://localhost:2900
- **Redis**: localhost:6379
- **Tempo (Tracing)**: http://localhost:3200

## Roadmap

- [x] Create automated tests
- [ ] Implement core OIDC
  - [ ] `/token`
    - [x] `authorization_code`
    - [ ] `refresh_token`
  - [ ] `/userinfo`
  - [ ] `.well-known`
    - [ ] `/.well-known/jwks.json`
    - [ ] `/.well-known/openid-configuration`
- [x] Change "keycloak integration" to generic OAuth password grant integration
- [ ] Support internal authentication and user management (self contained)
- [ ] Support MFA
  - [ ] Native MFA
    - [ ] TOTP
    - [ ] Email / SMS Code
    - [ ] Webauthn
- [ ] Add support for different authentication providers
  - [ ] AWS Cognito
  - [ ] Microsoft Entra Native Authentication
- [ ] SAML

## License

This project is licensed under the [Apache License 2.0](./LICENSE).

### Project status

This is a super early-stage project, currently under active development. It is open source by design, and we welcome feedback, contributions, and adoption.

### Future plans

As adoption grows, we may consider introducing a dual-licensing model to support advanced use cases (e.g., enterprise SSO integrations, visual dashboards, long-term support). The core will remain free and open under Apache 2.0.

If you're interested in sponsoring, partnering, or contributing ideas to the roadmap, please get in touch.
