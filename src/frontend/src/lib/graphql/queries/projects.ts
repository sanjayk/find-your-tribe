import { gql } from '@apollo/client';

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      title
      description
      status
      role
      techStack
      links
      impactMetrics
      githubRepoFullName
      githubStars
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
      collaborators {
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
      }
    }
  }
`;

export const GET_PROJECTS = gql`
  query GetProjects($limit: Int, $offset: Int, $status: String) {
    projects(limit: $limit, offset: $offset, status: $status) {
      id
      title
      description
      status
      role
      techStack
      githubStars
      createdAt
      updatedAt
    }
  }
`;
