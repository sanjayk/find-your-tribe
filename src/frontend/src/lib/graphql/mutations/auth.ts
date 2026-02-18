import { gql } from '@apollo/client';

export const SIGNUP = gql`
  mutation Signup($email: String!, $password: String!, $username: String!, $displayName: String!) {
    auth {
      signup(email: $email, password: $password, username: $username, displayName: $displayName) {
        accessToken
        refreshToken
        user {
          id
          username
          displayName
          email
          onboardingCompleted
        }
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    auth {
      login(email: $email, password: $password) {
        accessToken
        refreshToken
        user {
          id
          username
          displayName
          email
          onboardingCompleted
        }
      }
    }
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($token: String!) {
    auth {
      refreshToken(token: $token) {
        accessToken
        refreshToken
        user {
          id
          username
          displayName
        }
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout($token: String!) {
    auth {
      logout(token: $token)
    }
  }
`;

export const COMPLETE_ONBOARDING = gql`
  mutation CompleteOnboarding(
    $displayName: String!
    $headline: String
    $primaryRole: String
    $timezone: String
    $availabilityStatus: String
    $skillIds: [ID!]
  ) {
    auth {
      completeOnboarding(
        displayName: $displayName
        headline: $headline
        primaryRole: $primaryRole
        timezone: $timezone
        availabilityStatus: $availabilityStatus
        skillIds: $skillIds
      ) {
        id
        username
        displayName
        headline
        primaryRole
        onboardingCompleted
      }
    }
  }
`;
