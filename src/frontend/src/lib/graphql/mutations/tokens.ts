import { gql } from '@apollo/client';

export const CREATE_API_TOKEN = gql`
  mutation CreateApiToken($name: String!) {
    apiTokens {
      createApiToken(name: $name) {
        id
        name
        token
      }
    }
  }
`;

export const REVOKE_API_TOKEN = gql`
  mutation RevokeApiToken($tokenId: String!) {
    apiTokens {
      revokeApiToken(tokenId: $tokenId)
    }
  }
`;
