import { gql } from '@apollo/client';

export const GET_TRIBE = gql`
  query GetTribe($id: ID!) {
    tribe(id: $id) {
      id
      name
      mission
      status
      maxMembers
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
        headline
        primaryRole
      }
      members {
        user {
          id
          username
          displayName
          avatarUrl
          headline
          primaryRole
        }
        role
        status
        joinedAt
        requestedRole {
          id
          title
          skillsNeeded
        }
      }
      openRoles {
        id
        title
        skillsNeeded
        filled
      }
    }
  }
`;

export const GET_TRIBES = gql`
  query GetTribes($limit: Int, $offset: Int, $status: String) {
    tribes(limit: $limit, offset: $offset, status: $status) {
      id
      name
      mission
      status
      maxMembers
      members {
        user {
          id
          username
          displayName
          avatarUrl
        }
        role
        status
      }
      openRoles {
        id
        title
        skillsNeeded
        filled
      }
    }
  }
`;

export const SEARCH_TRIBES = gql`
  query SearchTribes($query: String!, $limit: Int, $offset: Int) {
    searchTribes(query: $query, limit: $limit, offset: $offset) {
      id
      name
      mission
      status
      maxMembers
      createdAt
      owner {
        id
        displayName
        avatarUrl
      }
      members {
        user {
          id
          displayName
          avatarUrl
        }
        role
        status
      }
      openRoles {
        id
        title
        skillsNeeded
        filled
      }
    }
  }
`;
