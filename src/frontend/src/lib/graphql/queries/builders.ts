import { gql } from '@apollo/client';

export const GET_BUILDER = gql`
  query GetBuilder($username: String!) {
    user(username: $username) {
      id
      username
      displayName
      avatarUrl
      headline
      primaryRole
      timezone
      availabilityStatus
      builderScore
      bio
      contactLinks
      githubUsername
      agentTools
      agentWorkflowStyle
      humanAgentRatio
      createdAt
      skills {
        id
        name
        slug
        category
      }
      projects {
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
      tribes {
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
  }
`;

export const GET_BUILDERS = gql`
  query GetBuilders($limit: Int, $offset: Int) {
    builders(limit: $limit, offset: $offset) {
      id
      username
      displayName
      avatarUrl
      headline
      primaryRole
      timezone
      availabilityStatus
      builderScore
      bio
      contactLinks
      githubUsername
      skills {
        id
        name
        slug
      }
    }
  }
`;
