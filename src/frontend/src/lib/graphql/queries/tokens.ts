import { gql } from '@apollo/client';

export const MY_API_TOKENS = gql`
  query MyApiTokens {
    myApiTokens {
      id
      name
      lastUsedAt
      createdAt
      expiresAt
    }
  }
`;
