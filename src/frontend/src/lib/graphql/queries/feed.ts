import { gql } from '@apollo/client';

export const GET_FEED = gql`
  query GetFeed($limit: Int, $offset: Int) {
    feed(limit: $limit, offset: $offset) {
      id
      eventType
      targetType
      targetId
      metadata
      createdAt
    }
  }
`;
