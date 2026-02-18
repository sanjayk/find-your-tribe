import { gql } from '@apollo/client';

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $displayName: String
    $headline: String
    $bio: String
    $primaryRole: String
    $timezone: String
    $availabilityStatus: String
    $contactLinks: JSON
    $agentTools: JSON
    $agentWorkflowStyle: String
    $humanAgentRatio: Float
    $preferences: JSON
  ) {
    profile {
      updateProfile(
        displayName: $displayName
        headline: $headline
        bio: $bio
        primaryRole: $primaryRole
        timezone: $timezone
        availabilityStatus: $availabilityStatus
        contactLinks: $contactLinks
        agentTools: $agentTools
        agentWorkflowStyle: $agentWorkflowStyle
        humanAgentRatio: $humanAgentRatio
        preferences: $preferences
      ) {
        id
        username
        displayName
        avatarUrl
        headline
        bio
        primaryRole
        timezone
        availabilityStatus
        contactLinks
        agentTools
        agentWorkflowStyle
        humanAgentRatio
        preferences
      }
    }
  }
`;
