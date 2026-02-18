import { gql } from '@apollo/client';

export const CREATE_TRIBE = gql`
  mutation CreateTribe($name: String!, $mission: String, $maxMembers: Int) {
    tribes {
      createTribe(name: $name, mission: $mission, maxMembers: $maxMembers) {
        id
        name
        mission
        status
        maxMembers
      }
    }
  }
`;

export const UPDATE_TRIBE = gql`
  mutation UpdateTribe($id: ID!, $name: String, $mission: String, $status: String, $maxMembers: Int) {
    tribes {
      updateTribe(id: $id, name: $name, mission: $mission, status: $status, maxMembers: $maxMembers) {
        id
        name
        mission
        status
        maxMembers
      }
    }
  }
`;

export const ADD_OPEN_ROLE = gql`
  mutation AddOpenRole($tribeId: ID!, $title: String!, $skillsNeeded: [String!]) {
    tribes {
      addOpenRole(tribeId: $tribeId, title: $title, skillsNeeded: $skillsNeeded) {
        id
        title
        skillsNeeded
        filled
      }
    }
  }
`;

export const REMOVE_OPEN_ROLE = gql`
  mutation RemoveOpenRole($roleId: ID!) {
    tribes {
      removeOpenRole(roleId: $roleId)
    }
  }
`;

export const REQUEST_TO_JOIN = gql`
  mutation RequestToJoin($tribeId: ID!) {
    tribes {
      requestToJoin(tribeId: $tribeId)
    }
  }
`;

export const APPROVE_MEMBER = gql`
  mutation ApproveMember($tribeId: ID!, $memberId: ID!) {
    tribes {
      approveMember(tribeId: $tribeId, memberId: $memberId)
    }
  }
`;

export const REJECT_MEMBER = gql`
  mutation RejectMember($tribeId: ID!, $memberId: ID!) {
    tribes {
      rejectMember(tribeId: $tribeId, memberId: $memberId)
    }
  }
`;

export const REMOVE_MEMBER = gql`
  mutation RemoveMember($tribeId: ID!, $memberId: ID!) {
    tribes {
      removeMember(tribeId: $tribeId, memberId: $memberId)
    }
  }
`;

export const LEAVE_TRIBE = gql`
  mutation LeaveTribe($tribeId: ID!) {
    tribes {
      leaveTribe(tribeId: $tribeId)
    }
  }
`;
