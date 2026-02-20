import { gql } from '@apollo/client';

export const IMPORT_GITHUB_PROJECT = gql`
  mutation ImportGithubProject($repoFullName: String!, $role: String) {
    projects {
      importFromGithub(repoFullName: $repoFullName, role: $role) {
        id
        title
        description
        techStack
        githubStars
        githubRepoFullName
      }
    }
  }
`;
