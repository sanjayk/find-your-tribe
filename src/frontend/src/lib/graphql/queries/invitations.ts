import { gql } from '@apollo/client';

export const TAG_SUGGESTIONS = gql`
  query TagSuggestions($field: String!, $query: String, $limit: Int) {
    tagSuggestions(field: $field, query: $query, limit: $limit)
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!, $limit: Int) {
    searchUsers(query: $query, limit: $limit) {
      id
      username
      displayName
      avatarUrl
      headline
      primaryRole
    }
  }
`;

export const INVITE_TOKEN_INFO = gql`
  query InviteTokenInfo($token: String!) {
    inviteTokenInfo(token: $token) {
      projectTitle
      projectId
      inviterName
      inviterAvatarUrl
      role
      expired
    }
  }
`;

export const MY_PENDING_INVITATIONS = gql`
  query MyPendingInvitations {
    myPendingInvitations {
      projectId
      projectTitle
      role
      inviter {
        id
        username
        displayName
        avatarUrl
        headline
        primaryRole
      }
      invitedAt
    }
  }
`;
