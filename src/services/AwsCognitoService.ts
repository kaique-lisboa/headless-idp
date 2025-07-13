import { AWSCognitoAuthProviderConfig, Config, TenantConfig } from "@/core/config";
import { createLogger } from "@/core/logger";
import { AdminInitiateAuthCommand, AuthenticationResultType, ChallengeNameType, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import * as jose from 'jose';
import { createHmac } from 'crypto';


export type CognitoAuthResponse = {
    type: 'authenticated',
    authenticationResult: AuthenticationResultType
} | {
    type: 'challenge',
    challengeName: ChallengeNameType,
    challengeParameters?: Record<string, string>
} | {
    type: 'error',
    exception: Error,
}

export type CognitoIdTokenPayload = {
    sub: string
    email?: string
    email_verified?: boolean
    phone_number?: string
    phone_number_verified?: boolean
    given_name?: string
    family_name?: string
    preferred_username?: string
    name?: string
    birthdate?: string
    gender?: string
    locale?: string
    updated_at?: number
    picture?: string
    aud: string
    iss: string
    exp: number
    iat: number
    auth_time?: number
    nonce?: string
    at_hash?: string
    [claim: `custom:${string}`]: any
  }

  export type CognitoAccessTokenPayload = {
    sub: string
    username: string
    event_id: string
    token_use: 'access'
    scope: string
    auth_time: number
    iss: string
    exp: number
    iat: number
    jti: string
    client_id: string
    version: number
  }

export class AwsCognitoService {

  private cognitoClient: CognitoIdentityProviderClient;
  private authProvider: AWSCognitoAuthProviderConfig;

  constructor(readonly tenant: TenantConfig, private readonly logger = createLogger('AwsCognitoService')) {
    if(tenant.auth_provider.type !== 'cognito') {
      throw new Error('Tenant auth provider is not Cognito');
    }
    this.authProvider = tenant.auth_provider;
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: tenant.auth_provider.region,
    });
  }

  decodeIdToken(token: string) {
    return jose.decodeJwt(token) as CognitoIdTokenPayload;
  }

  decodeAccessToken(token: string) {
    return jose.decodeJwt(token) as CognitoAccessTokenPayload;
  }

  async authenticate(username: string, password: string): Promise<CognitoAuthResponse> {
    const authParameters: Record<string, string> = {
      USERNAME: username,
      PASSWORD: password,
    };

    // Add SECRET_HASH if client_secret is configured
    if (this.authProvider.client_secret) {
      const message = username + this.authProvider.client_id;
      const secretHash = createHmac('sha256', this.authProvider.client_secret)
        .update(message)
        .digest('base64');
      authParameters.SECRET_HASH = secretHash;
    }

    const authResponse = await this.cognitoClient.send(new AdminInitiateAuthCommand({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      ClientId: this.authProvider.client_id,
      UserPoolId: this.authProvider.user_pool_id,
      AuthParameters: authParameters,
    })).then((response) => {
        return {
            ...response,
            exception: undefined,
        }
    }).catch((error) => {
        return {
            type: 'error',
            exception: error,
            AuthenticationResult: undefined,
            ChallengeName: undefined,
            ChallengeParameters: undefined,
        }
    });
    if(authResponse.AuthenticationResult) {
        this.logger.info({ authenticationResult: authResponse.AuthenticationResult }, 'Authenticated');
        return {
            type: 'authenticated',
            authenticationResult: authResponse.AuthenticationResult,
        }
    }
    if(authResponse.ChallengeName) {
        this.logger.info({ challengeName: authResponse.ChallengeName, challengeParameters: authResponse.ChallengeParameters }, 'Challenge detected');
        return {
            type: 'challenge',
            challengeName: authResponse.ChallengeName,
            challengeParameters: authResponse.ChallengeParameters,
        }
    }
    if(authResponse.exception) {
        this.logger.error(authResponse.exception, 'Error authenticating');
        return {
            type: 'error',
            exception: authResponse.exception,
        }
    }
    return {
        type: 'error',
        exception: new Error('Unknown error'),
    }
  }
}