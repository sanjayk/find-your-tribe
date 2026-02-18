import { gql } from '@apollo/client';

export const GET_BURN_SUMMARY = gql`
  query GetBurnSummary($userId: ID!, $weeks: Int) {
    burnSummary(userId: $userId, weeks: $weeks) {
      daysActive
      totalTokens
      activeWeeks
      totalWeeks
      weeklyStreak
      dailyActivity {
        date
        tokens
      }
    }
  }
`;

export const GET_BURN_RECEIPT = gql`
  query GetBurnReceipt($userId: ID!, $projectId: ID!) {
    burnReceipt(userId: $userId, projectId: $projectId) {
      projectId
      totalTokens
      durationWeeks
      peakWeekTokens
      dailyActivity {
        date
        tokens
      }
    }
  }
`;
