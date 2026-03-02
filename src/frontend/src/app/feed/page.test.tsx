import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FeedEvent, EventType } from '@/lib/graphql/types';

/* ─── Mocks ─── */

const mockUseQuery = vi.fn();
vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock('next/link', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import FeedPage from './page';

/* ─── Factory helpers ─── */

let seq = 0;

function makeEvent(
  eventType: EventType,
  targetType: string,
  metadata: Record<string, unknown>,
  overrides: Partial<FeedEvent> = {},
): FeedEvent {
  seq += 1;
  return {
    id: overrides.id ?? `evt-${seq}`,
    eventType,
    targetType,
    targetId: overrides.targetId ?? `target-${seq}`,
    metadata,
    createdAt: overrides.createdAt ?? '2025-06-15T10:30:00Z',
  };
}

function projectShipped(
  meta: Record<string, unknown> = {},
  overrides: Partial<FeedEvent> = {},
) {
  return makeEvent(
    'PROJECT_SHIPPED',
    'PROJECT',
    {
      actor_name: 'Maya Chen',
      project_title: 'Tribe Finder',
      tech_stack: ['React', 'Node.js'],
      ...meta,
    },
    overrides,
  );
}

function projectCreated(
  meta: Record<string, unknown> = {},
  overrides: Partial<FeedEvent> = {},
) {
  return makeEvent(
    'PROJECT_CREATED',
    'PROJECT',
    {
      actor_name: 'Alex Kim',
      project_title: 'BuildLog',
      tech_stack: ['TypeScript', 'Next.js'],
      ...meta,
    },
    overrides,
  );
}

function tribeCreated(
  meta: Record<string, unknown> = {},
  overrides: Partial<FeedEvent> = {},
) {
  return makeEvent(
    'TRIBE_CREATED',
    'TRIBE',
    {
      actor_name: 'James Okafor',
      tribe_name: 'Buildspace Alumni',
      mission: 'Ship weekly or perish',
      ...meta,
    },
    overrides,
  );
}

function projectUpdate(
  meta: Record<string, unknown> = {},
  overrides: Partial<FeedEvent> = {},
) {
  return makeEvent(
    'PROJECT_UPDATE',
    'PROJECT',
    {
      actor_name: 'Sara Lee',
      content: 'Just deployed v2',
      project_title: 'WidgetKit',
      ...meta,
    },
    overrides,
  );
}

function tribeAnnouncement(
  meta: Record<string, unknown> = {},
  overrides: Partial<FeedEvent> = {},
) {
  return makeEvent(
    'TRIBE_ANNOUNCEMENT',
    'TRIBE',
    {
      actor_name: 'Chris Park',
      content: 'Demo day Friday',
      tribe_name: 'Indie Hackers',
      ...meta,
    },
    overrides,
  );
}

function memberJoinedTribe(
  meta: Record<string, unknown> = {},
  overrides: Partial<FeedEvent> = {},
) {
  return makeEvent(
    'MEMBER_JOINED_TRIBE',
    'TRIBE',
    {
      actor_name: 'Dana White',
      tribe_name: 'Buildspace Alumni',
      ...meta,
    },
    overrides,
  );
}

function collaborationConfirmed(
  meta: Record<string, unknown> = {},
  overrides: Partial<FeedEvent> = {},
) {
  return makeEvent(
    'COLLABORATION_CONFIRMED',
    'PROJECT',
    {
      actor_name: 'Eve Torres',
      project_title: 'WidgetKit',
      ...meta,
    },
    overrides,
  );
}

function builderJoined(
  meta: Record<string, unknown> = {},
  overrides: Partial<FeedEvent> = {},
) {
  return makeEvent(
    'BUILDER_JOINED',
    'USER',
    {
      actor_name: 'Frank Li',
      skills: ['React', 'TypeScript', 'GraphQL'],
      ...meta,
    },
    overrides,
  );
}

/* ─── Query mock helpers ─── */

function mockFeed(events: FeedEvent[]) {
  mockUseQuery.mockReturnValue({
    data: { feed: events },
    loading: false,
    error: undefined,
    fetchMore: vi.fn(),
  });
}

function mockLoading() {
  mockUseQuery.mockReturnValue({
    data: undefined,
    loading: true,
    error: undefined,
    fetchMore: vi.fn(),
  });
}

function mockError() {
  mockUseQuery.mockReturnValue({
    data: undefined,
    loading: false,
    error: new Error('Network error'),
    fetchMore: vi.fn(),
  });
}

/* ─── Tests ─── */

beforeEach(() => {
  seq = 0;
  mockUseQuery.mockReset();
});

describe('FeedPage', () => {
  /* ── 1. Timeline structure ── */

  describe('timeline structure', () => {
    it('renders a timeline container with thread line', () => {
      mockFeed([projectShipped()]);
      render(<FeedPage />);
      expect(screen.getByTestId('feed-timeline')).toBeInTheDocument();
    });

    it('renders each event as an article element', () => {
      mockFeed([projectShipped(), tribeCreated(), builderJoined()]);
      render(<FeedPage />);
      expect(screen.getAllByRole('article')).toHaveLength(3);
    });

    it('renders avatar circles with aria-hidden="true"', () => {
      mockFeed([projectShipped()]);
      const { container } = render(<FeedPage />);
      const article = container.querySelector('article')!;
      const avatar = article.querySelector('[aria-hidden="true"]');
      expect(avatar).toBeInTheDocument();
    });

    it('renders timestamps as time elements with datetime attribute', () => {
      const ts = '2025-06-15T10:30:00Z';
      mockFeed([projectShipped({}, { createdAt: ts })]);
      const { container } = render(<FeedPage />);
      const timeEl = container.querySelector('time');
      expect(timeEl).toBeInTheDocument();
      expect(timeEl).toHaveAttribute('datetime', ts);
    });
  });

  /* ── 2. Milestone card (PROJECT_SHIPPED) ── */

  describe('milestone card (PROJECT_SHIPPED)', () => {
    it('renders project title text', () => {
      mockFeed([projectShipped()]);
      render(<FeedPage />);
      expect(screen.getByText('Tribe Finder')).toBeInTheDocument();
    });

    it('renders tech stack items joined with middle dot', () => {
      mockFeed([projectShipped()]);
      render(<FeedPage />);
      expect(screen.getByText('React \u00b7 Node.js')).toBeInTheDocument();
    });

    it('shows actor name and "shipped" action text', () => {
      mockFeed([projectShipped()]);
      render(<FeedPage />);
      expect(screen.getByText('Maya Chen')).toBeInTheDocument();
      expect(screen.getByText('shipped')).toBeInTheDocument();
    });

    it('wraps in Link with /project/{targetId} href', () => {
      mockFeed([projectShipped({}, { targetId: 'p1' })]);
      render(<FeedPage />);
      expect(screen.getByRole('link')).toHaveAttribute('href', '/project/p1');
    });
  });

  /* ── 3. Content embed (PROJECT_CREATED) ── */

  describe('content embed (PROJECT_CREATED)', () => {
    it('renders project title', () => {
      mockFeed([projectCreated()]);
      render(<FeedPage />);
      expect(screen.getByText('BuildLog')).toBeInTheDocument();
    });

    it('renders tech stack', () => {
      mockFeed([projectCreated()]);
      render(<FeedPage />);
      expect(
        screen.getByText('TypeScript \u00b7 Next.js'),
      ).toBeInTheDocument();
    });

    it('shows actor name and "started building" action text', () => {
      mockFeed([projectCreated()]);
      render(<FeedPage />);
      expect(screen.getByText('Alex Kim')).toBeInTheDocument();
      expect(screen.getByText('started building')).toBeInTheDocument();
    });

    it('wraps in Link with /project/{targetId} href', () => {
      mockFeed([projectCreated({}, { targetId: 'p2' })]);
      render(<FeedPage />);
      expect(screen.getByRole('link')).toHaveAttribute('href', '/project/p2');
    });
  });

  /* ── 4. Content embed (TRIBE_CREATED) ── */

  describe('content embed (TRIBE_CREATED)', () => {
    it('renders tribe name', () => {
      mockFeed([tribeCreated()]);
      render(<FeedPage />);
      expect(screen.getByText('Buildspace Alumni')).toBeInTheDocument();
    });

    it('renders mission text', () => {
      mockFeed([tribeCreated()]);
      render(<FeedPage />);
      expect(screen.getByText('Ship weekly or perish')).toBeInTheDocument();
    });

    it('shows actor name and "formed a tribe" action text', () => {
      mockFeed([tribeCreated()]);
      render(<FeedPage />);
      expect(screen.getByText('James Okafor')).toBeInTheDocument();
      expect(screen.getByText('formed a tribe')).toBeInTheDocument();
    });

    it('wraps in Link with /tribe/{targetId} href', () => {
      mockFeed([tribeCreated({}, { targetId: 't1' })]);
      render(<FeedPage />);
      expect(screen.getByRole('link')).toHaveAttribute('href', '/tribe/t1');
    });
  });

  /* ── 5. Text card (PROJECT_UPDATE) ── */

  describe('text card (PROJECT_UPDATE)', () => {
    it('renders content text', () => {
      mockFeed([projectUpdate()]);
      render(<FeedPage />);
      expect(screen.getByText(/Just deployed v2/)).toBeInTheDocument();
    });

    it('renders source attribution with project title', () => {
      mockFeed([projectUpdate()]);
      render(<FeedPage />);
      expect(screen.getByText('on WidgetKit')).toBeInTheDocument();
    });

    it('shows actor name and "posted an update" action text', () => {
      mockFeed([projectUpdate()]);
      render(<FeedPage />);
      expect(screen.getByText('Sara Lee')).toBeInTheDocument();
      expect(screen.getByText('posted an update')).toBeInTheDocument();
    });
  });

  /* ── 6. Text card (TRIBE_ANNOUNCEMENT) ── */

  describe('text card (TRIBE_ANNOUNCEMENT)', () => {
    it('renders content text', () => {
      mockFeed([tribeAnnouncement()]);
      render(<FeedPage />);
      expect(screen.getByText(/Demo day Friday/)).toBeInTheDocument();
    });

    it('renders source attribution with tribe name', () => {
      mockFeed([tribeAnnouncement()]);
      render(<FeedPage />);
      expect(screen.getByText('in Indie Hackers')).toBeInTheDocument();
    });

    it('shows actor name and "announced" action text', () => {
      mockFeed([tribeAnnouncement()]);
      render(<FeedPage />);
      expect(screen.getByText('Chris Park')).toBeInTheDocument();
      expect(screen.getByText('announced')).toBeInTheDocument();
    });
  });

  /* ── 7. Activity line (MEMBER_JOINED_TRIBE) ── */

  describe('activity line (MEMBER_JOINED_TRIBE)', () => {
    it('renders actor name and tribe name', () => {
      mockFeed([memberJoinedTribe()]);
      render(<FeedPage />);
      expect(screen.getAllByText('Dana White').length).toBeGreaterThanOrEqual(
        1,
      );
      expect(
        screen.getByText(/joined Buildspace Alumni/),
      ).toBeInTheDocument();
    });

    it('is compact (no expanded card body)', () => {
      mockFeed([memberJoinedTribe()]);
      const { container } = render(<FeedPage />);
      const article = container.querySelector('article');
      expect(article).toHaveClass('py-2');
    });
  });

  /* ── 8. Activity line (COLLABORATION_CONFIRMED) ── */

  describe('activity line (COLLABORATION_CONFIRMED)', () => {
    it('renders actor name and project title', () => {
      mockFeed([collaborationConfirmed()]);
      render(<FeedPage />);
      expect(
        screen.getAllByText('Eve Torres').length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/joined WidgetKit/)).toBeInTheDocument();
    });
  });

  /* ── 9. Activity line (BUILDER_JOINED) ── */

  describe('activity line (BUILDER_JOINED)', () => {
    it('renders actor name and "joined"', () => {
      mockFeed([builderJoined()]);
      render(<FeedPage />);
      expect(
        screen.getAllByText('Frank Li').length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('joined')).toBeInTheDocument();
    });

    it('renders skills separated by / when present', () => {
      mockFeed([builderJoined()]);
      render(<FeedPage />);
      expect(
        screen.getByText('React / TypeScript / GraphQL'),
      ).toBeInTheDocument();
    });

    it('hides skills section when skills array is empty', () => {
      mockFeed([builderJoined({ skills: [] })]);
      render(<FeedPage />);
      expect(screen.queryByText(/React/)).not.toBeInTheDocument();
    });
  });

  /* ── 10. Fallback behavior ── */

  describe('fallback behavior', () => {
    it('shows actor_username when actor_name is missing', () => {
      mockFeed([
        projectShipped({ actor_name: undefined, actor_username: 'mayac' }),
      ]);
      render(<FeedPage />);
      expect(screen.getByText('mayac')).toBeInTheDocument();
    });

    it('shows "A builder" when both name fields are missing', () => {
      mockFeed([
        projectShipped({
          actor_name: undefined,
          actor_username: undefined,
        }),
      ]);
      render(<FeedPage />);
      expect(screen.getByText('A builder')).toBeInTheDocument();
    });

    it('shows "Untitled project" when project_title is missing', () => {
      mockFeed([projectShipped({ project_title: undefined })]);
      render(<FeedPage />);
      expect(screen.getByText('Untitled project')).toBeInTheDocument();
    });

    it('shows "Untitled tribe" when tribe_name is missing', () => {
      mockFeed([tribeCreated({ tribe_name: undefined })]);
      render(<FeedPage />);
      expect(screen.getByText('Untitled tribe')).toBeInTheDocument();
    });

    it('hides tech stack section when tech_stack is missing', () => {
      mockFeed([projectShipped({ tech_stack: undefined })]);
      render(<FeedPage />);
      expect(
        screen.queryByText('React \u00b7 Node.js'),
      ).not.toBeInTheDocument();
    });

    it('hides text card body when content is missing', () => {
      mockFeed([projectUpdate({ content: undefined })]);
      render(<FeedPage />);
      expect(screen.queryByText(/Just deployed/)).not.toBeInTheDocument();
      expect(screen.getByText('on WidgetKit')).toBeInTheDocument();
    });

    it('hides skills section when skills are missing', () => {
      mockFeed([builderJoined({ skills: undefined })]);
      render(<FeedPage />);
      expect(
        screen.queryByText('React / TypeScript / GraphQL'),
      ).not.toBeInTheDocument();
    });
  });

  /* ── 11. Navigation links ── */

  describe('navigation links', () => {
    it('project events link to /project/{targetId}', () => {
      mockFeed([projectShipped({}, { targetId: 'proj-abc' })]);
      render(<FeedPage />);
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        '/project/proj-abc',
      );
    });

    it('tribe events link to /tribe/{targetId}', () => {
      mockFeed([tribeCreated({}, { targetId: 'tribe-xyz' })]);
      render(<FeedPage />);
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        '/tribe/tribe-xyz',
      );
    });

    it('user events link to /profile/{targetId}', () => {
      mockFeed([builderJoined({}, { targetId: 'user-123' })]);
      render(<FeedPage />);
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        '/profile/user-123',
      );
    });
  });

  /* ── 12. Loading state ── */

  describe('loading state', () => {
    it('shows skeleton with avatar circles and content blocks when loading', () => {
      mockLoading();
      render(<FeedPage />);
      expect(screen.getByTestId('feed-skeleton')).toBeInTheDocument();
    });
  });

  /* ── 13. Empty state ── */

  describe('empty state', () => {
    it('shows "Nothing here yet" when feed returns empty array', () => {
      mockFeed([]);
      render(<FeedPage />);
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    });
  });

  /* ── 14. Error state ── */

  describe('error state', () => {
    it('shows error message when query fails', () => {
      mockError();
      render(<FeedPage />);
      expect(screen.getByTestId('feed-error')).toBeInTheDocument();
      expect(
        screen.getByText(/Couldn.t load the feed/),
      ).toBeInTheDocument();
    });
  });
});
