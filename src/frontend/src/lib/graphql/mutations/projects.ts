import { gql } from '@apollo/client';

export const CREATE_PROJECT = gql`
  mutation CreateProject(
    $title: String!
    $description: String
    $status: String
    $role: String
    $links: JSON
    $techStack: [String!]
    $impactMetrics: JSON
  ) {
    projects {
      createProject(
        title: $title
        description: $description
        status: $status
        role: $role
        links: $links
        techStack: $techStack
        impactMetrics: $impactMetrics
      ) {
        id
        title
        description
        status
        role
        techStack
        createdAt
      }
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject(
    $id: ID!
    $title: String
    $description: String
    $status: String
    $role: String
    $links: JSON
    $techStack: [String!]
    $impactMetrics: JSON
  ) {
    projects {
      updateProject(
        id: $id
        title: $title
        description: $description
        status: $status
        role: $role
        links: $links
        techStack: $techStack
        impactMetrics: $impactMetrics
      ) {
        id
        title
        description
        status
        role
        techStack
        updatedAt
      }
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    projects {
      deleteProject(id: $id)
    }
  }
`;

export const INVITE_COLLABORATOR = gql`
  mutation InviteCollaborator($projectId: ID!, $userId: ID!, $role: String) {
    projects {
      inviteCollaborator(projectId: $projectId, userId: $userId, role: $role)
    }
  }
`;

export const CONFIRM_COLLABORATION = gql`
  mutation ConfirmCollaboration($projectId: ID!) {
    projects {
      confirmCollaboration(projectId: $projectId)
    }
  }
`;

export const DECLINE_COLLABORATION = gql`
  mutation DeclineCollaboration($projectId: ID!) {
    projects {
      declineCollaboration(projectId: $projectId)
    }
  }
`;

export const REMOVE_COLLABORATOR = gql`
  mutation RemoveCollaborator($projectId: ID!, $userId: ID!) {
    projects {
      removeCollaborator(projectId: $projectId, userId: $userId)
    }
  }
`;
