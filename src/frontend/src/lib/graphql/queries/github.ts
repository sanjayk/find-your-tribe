import { gql } from '@apollo/client';

export const MY_GITHUB_REPOS = gql`
  query MyGithubRepos($page: Int, $perPage: Int) {
    myGithubRepos(page: $page, perPage: $perPage) {
      fullName
      description
      languages
      stars
      url
    }
  }
`;
