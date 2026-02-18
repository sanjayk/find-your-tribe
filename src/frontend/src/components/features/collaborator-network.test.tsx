import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CollaboratorNetwork } from './collaborator-network';

import type { Project } from '@/lib/graphql/types';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    title: 'Test Project',
    description: 'A test project',
    status: 'SHIPPED',
    role: 'creator',
    techStack: ['React'],
    links: {},
    impactMetrics: {},
    githubRepoFullName: null,
    githubStars: null,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
    collaborators: [],
    ...overrides,
  };
}

const selfUsername = 'mayachen';

const projectWithCollaborators = makeProject({
  collaborators: [
    {
      user: {
        id: '1',
        username: 'mayachen',
        displayName: 'Maya Chen',
        avatarUrl: null,
        headline: null,
        primaryRole: null,
      },
      role: 'creator',
      status: 'ACTIVE',
    },
    {
      user: {
        id: '2',
        username: 'jamesokafor',
        displayName: 'James Okafor',
        avatarUrl: null,
        headline: null,
        primaryRole: null,
      },
      role: 'design',
      status: 'ACTIVE',
    },
    {
      user: {
        id: '3',
        username: 'sarali',
        displayName: 'Sara Li',
        avatarUrl: 'https://example.com/sara.jpg',
        headline: null,
        primaryRole: null,
      },
      role: 'engineering',
      status: 'ACTIVE',
    },
  ],
});

describe('CollaboratorNetwork', () => {
  it('renders without crashing', () => {
    render(
      <CollaboratorNetwork
        projects={[projectWithCollaborators]}
        selfUsername={selfUsername}
      />,
    );
  });

  it('renders the "Built With" label', () => {
    render(
      <CollaboratorNetwork
        projects={[projectWithCollaborators]}
        selfUsername={selfUsername}
      />,
    );
    expect(screen.getByText('Built With')).toBeInTheDocument();
  });

  it('renders collaborator names excluding self', () => {
    render(
      <CollaboratorNetwork
        projects={[projectWithCollaborators]}
        selfUsername={selfUsername}
      />,
    );
    expect(screen.queryByText('Maya Chen')).not.toBeInTheDocument();
    expect(screen.getByText('James Okafor')).toBeInTheDocument();
    expect(screen.getByText('Sara Li')).toBeInTheDocument();
  });

  it('renders profile links for collaborators', () => {
    render(
      <CollaboratorNetwork
        projects={[projectWithCollaborators]}
        selfUsername={selfUsername}
      />,
    );
    const links = screen.getAllByRole('link');
    const jamesLinks = links.filter(
      (link) => link.getAttribute('href') === '/profile/jamesokafor',
    );
    expect(jamesLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders initials for collaborators without avatarUrl', () => {
    render(
      <CollaboratorNetwork
        projects={[projectWithCollaborators]}
        selfUsername={selfUsername}
      />,
    );
    // James Okafor -> "JO"
    expect(screen.getByText('JO')).toBeInTheDocument();
  });

  it('renders avatar image when avatarUrl is provided', () => {
    render(
      <CollaboratorNetwork
        projects={[projectWithCollaborators]}
        selfUsername={selfUsername}
      />,
    );
    const img = screen.getByAltText('Sara Li');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe('https://example.com/sara.jpg');
  });

  it('returns null when no collaborators exist', () => {
    const emptyProject = makeProject({ collaborators: [] });
    const { container } = render(
      <CollaboratorNetwork
        projects={[emptyProject]}
        selfUsername={selfUsername}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when only self is a collaborator', () => {
    const selfOnlyProject = makeProject({
      collaborators: [
        {
          user: {
            id: '1',
            username: 'mayachen',
            displayName: 'Maya Chen',
            avatarUrl: null,
            headline: null,
            primaryRole: null,
          },
          role: 'creator',
          status: 'ACTIVE',
        },
      ],
    });
    const { container } = render(
      <CollaboratorNetwork
        projects={[selfOnlyProject]}
        selfUsername={selfUsername}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('deduplicates collaborators across multiple projects', () => {
    const project2 = makeProject({
      id: 'p2',
      collaborators: [
        {
          user: {
            id: '2',
            username: 'jamesokafor',
            displayName: 'James Okafor',
            avatarUrl: null,
            headline: null,
            primaryRole: null,
          },
          role: 'design',
          status: 'ACTIVE',
        },
      ],
    });
    render(
      <CollaboratorNetwork
        projects={[projectWithCollaborators, project2]}
        selfUsername={selfUsername}
      />,
    );
    // James should appear only once in the name links
    const jamesNameLinks = screen.getAllByText('James Okafor');
    // There's one text link and one avatar — both rendered once for the unique collaborator
    expect(jamesNameLinks).toHaveLength(1);
  });

  it('handles projects with no collaborators field gracefully', () => {
    const noCollabField = makeProject();
    // Remove collaborators key to test the || [] guard
    delete (noCollabField as unknown as Record<string, unknown>).collaborators;
    const { container } = render(
      <CollaboratorNetwork
        projects={[noCollabField]}
        selfUsername={selfUsername}
      />,
    );
    expect(container.innerHTML).toBe('');
  });
});
