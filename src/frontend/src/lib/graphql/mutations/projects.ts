import { gql } from '@apollo/client';

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    projects {
      createProject(input: $input) {
        id
        title
        description
        status
        role
        links
        techStack
        createdAt
      }
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    projects {
      updateProject(id: $id, input: $input) {
        id
        title
        description
        status
        role
        techStack
        domains
        aiTools
        buildStyle
        services
        links
        impactMetrics
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
      inviteCollaborator(projectId: $projectId, userId: $userId, role: $role) {
        user {
          id
          username
          displayName
          avatarUrl
        }
        role
        status
        invitedAt
      }
    }
  }
`;

export const CONFIRM_COLLABORATION = gql`
  mutation ConfirmCollaboration($projectId: ID!) {
    projects {
      confirmCollaboration(projectId: $projectId) {
        user {
          id
          username
          displayName
        }
        role
        status
        confirmedAt
      }
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

export const ADD_MILESTONE = gql`
  mutation AddMilestone($projectId: ID!, $input: AddMilestoneInput!) {
    projects {
      addMilestone(projectId: $projectId, input: $input) {
        id
        title
        date
        milestoneType
        createdAt
      }
    }
  }
`;

export const DELETE_MILESTONE = gql`
  mutation DeleteMilestone($milestoneId: ID!) {
    projects {
      deleteMilestone(milestoneId: $milestoneId)
    }
  }
`;

export const GENERATE_INVITE_LINK = gql`
  mutation GenerateInviteLink($projectId: ID!, $role: String) {
    projects {
      generateInviteLink(projectId: $projectId, role: $role)
    }
  }
`;

export const REDEEM_INVITE_TOKEN = gql`
  mutation RedeemInviteToken($token: String!) {
    projects {
      redeemInviteToken(token: $token) {
        user {
          id
          username
          displayName
        }
        role
        status
      }
    }
  }
`;
