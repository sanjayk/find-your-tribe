import { describe, it, expect } from 'vitest';
import type {
  AvailabilityStatus,
  ProjectStatus,
  UserRole,
  SkillCategory,
  TribeStatus,
  MemberRole,
  MemberStatus,
  AgentWorkflowStyle,
  EventType,
  Skill,
  Collaborator,
  ProjectOwner,
  Project,
  TribeMember,
  OpenRole,
  Tribe,
  Builder,
  GetBuilderData,
  GetBuildersData,
  FeedEvent,
  AuthPayload,
  GetProjectData,
  GetProjectsData,
  GetTribeData,
  GetTribesData,
  GetFeedData,
  SignupData,
  LoginData,
  RefreshTokenData,
  LogoutData,
} from './types';

/**
 * These tests verify that all types are exported and can be used
 * for type-safe object creation. TypeScript compilation itself
 * serves as the primary "test" for type correctness. These runtime
 * tests verify the module is importable and that objects conforming
 * to the types can be constructed.
 */

describe('GraphQL types', () => {
  describe('union/literal types', () => {
    it('AvailabilityStatus accepts valid values', () => {
      const statuses: AvailabilityStatus[] = [
        'OPEN_TO_TRIBE',
        'AVAILABLE_FOR_PROJECTS',
        'JUST_BROWSING',
      ];
      expect(statuses).toHaveLength(3);
    });

    it('ProjectStatus accepts valid values', () => {
      const statuses: ProjectStatus[] = ['SHIPPED', 'IN_PROGRESS', 'ARCHIVED'];
      expect(statuses).toHaveLength(3);
    });

    it('UserRole accepts valid values', () => {
      const roles: UserRole[] = [
        'ENGINEER',
        'DESIGNER',
        'PM',
        'MARKETER',
        'GROWTH',
        'FOUNDER',
        'OTHER',
      ];
      expect(roles).toHaveLength(7);
    });

    it('SkillCategory accepts valid values', () => {
      const categories: SkillCategory[] = [
        'ENGINEERING',
        'DESIGN',
        'PRODUCT',
        'MARKETING',
        'GROWTH',
        'DATA',
        'OPERATIONS',
        'OTHER',
      ];
      expect(categories).toHaveLength(8);
    });

    it('TribeStatus accepts valid values', () => {
      const statuses: TribeStatus[] = ['OPEN', 'ACTIVE', 'ALUMNI'];
      expect(statuses).toHaveLength(3);
    });

    it('MemberRole accepts valid values', () => {
      const roles: MemberRole[] = ['OWNER', 'MEMBER'];
      expect(roles).toHaveLength(2);
    });

    it('MemberStatus accepts valid values', () => {
      const statuses: MemberStatus[] = ['ACTIVE', 'PENDING', 'REJECTED'];
      expect(statuses).toHaveLength(3);
    });

    it('AgentWorkflowStyle accepts valid values', () => {
      const styles: AgentWorkflowStyle[] = [
        'PAIR',
        'SWARM',
        'REVIEW',
        'AUTONOMOUS',
        'MINIMAL',
      ];
      expect(styles).toHaveLength(5);
    });

    it('EventType accepts valid values', () => {
      const types: EventType[] = [
        'PROJECT_SHIPPED',
        'PROJECT_CREATED',
        'PROJECT_UPDATE',
        'TRIBE_FORMED',
        'TRIBE_ANNOUNCEMENT',
        'COLLABORATOR_JOINED',
        'BUILDER_JOINED',
      ];
      expect(types).toHaveLength(7);
    });
  });

  describe('interface types', () => {
    it('Skill can be constructed', () => {
      const skill: Skill = {
        id: '01ABCDEF',
        name: 'TypeScript',
        slug: 'typescript',
        category: 'ENGINEERING',
      };
      expect(skill.id).toBe('01ABCDEF');
      expect(skill.category).toBe('ENGINEERING');
    });

    it('Collaborator can be constructed', () => {
      const collaborator: Collaborator = {
        user: {
          id: '01ABC',
          username: 'jdoe',
          displayName: 'Jane Doe',
          avatarUrl: null,
          headline: null,
          primaryRole: null,
        },
        role: 'MEMBER',
        status: 'ACTIVE',
      };
      expect(collaborator.user.username).toBe('jdoe');
    });

    it('ProjectOwner can be constructed', () => {
      const owner: ProjectOwner = {
        id: '01ABC',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: 'https://example.com/avatar.png',
        headline: 'Builder',
        primaryRole: 'ENGINEER',
      };
      expect(owner.username).toBe('alice');
    });

    it('Project can be constructed with all fields', () => {
      const project: Project = {
        id: '01PROJ',
        title: 'My Project',
        description: 'A great project',
        status: 'SHIPPED',
        role: 'Lead',
        techStack: ['TypeScript', 'React'],
        links: { github: 'https://github.com/test' },
        impactMetrics: { users: 1000 },
        githubRepoFullName: 'org/repo',
        githubStars: 42,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
        owner: {
          id: '01OWN',
          username: 'owner',
          displayName: 'Owner',
          avatarUrl: null,
          headline: null,
          primaryRole: null,
        },
        collaborators: [],
      };
      expect(project.title).toBe('My Project');
      expect(project.techStack).toHaveLength(2);
    });

    it('Project can be constructed with nullable fields as null', () => {
      const project: Project = {
        id: '01PROJ',
        title: 'Minimal Project',
        description: null,
        status: 'IN_PROGRESS',
        role: null,
        techStack: [],
        links: {},
        impactMetrics: {},
        githubRepoFullName: null,
        githubStars: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      expect(project.description).toBeNull();
      expect(project.githubStars).toBeNull();
    });

    it('TribeMember can be constructed', () => {
      const member: TribeMember = {
        user: {
          id: '01MEM',
          username: 'bob',
          displayName: 'Bob',
          avatarUrl: null,
        },
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: '2024-03-01T00:00:00Z',
      };
      expect(member.role).toBe('MEMBER');
      expect(member.joinedAt).toBeDefined();
    });

    it('OpenRole can be constructed', () => {
      const role: OpenRole = {
        id: '01ROLE',
        title: 'Frontend Engineer',
        skillsNeeded: ['React', 'TypeScript'],
        filled: false,
      };
      expect(role.filled).toBe(false);
      expect(role.skillsNeeded).toHaveLength(2);
    });

    it('Tribe can be constructed', () => {
      const tribe: Tribe = {
        id: '01TRIBE',
        name: 'Alpha Builders',
        mission: 'Ship fast',
        status: 'ACTIVE',
        maxMembers: 5,
        members: [],
        openRoles: [],
      };
      expect(tribe.name).toBe('Alpha Builders');
      expect(tribe.members).toHaveLength(0);
    });

    it('Builder can be constructed with full data', () => {
      const builder: Builder = {
        id: '01BUILD',
        username: 'shipper',
        displayName: 'The Shipper',
        avatarUrl: null,
        headline: 'Full-stack builder',
        primaryRole: 'ENGINEER',
        timezone: 'America/New_York',
        availabilityStatus: 'OPEN_TO_TRIBE',
        builderScore: 85,
        bio: 'I build things.',
        contactLinks: { twitter: '@shipper' },
        githubUsername: 'shipper',
        agentTools: ['Claude Code', 'Cursor'],
        agentWorkflowStyle: 'PAIR',
        humanAgentRatio: 40,
        createdAt: '2024-01-01T00:00:00Z',
        skills: [],
        projects: [],
        tribes: [],
      };
      expect(builder.builderScore).toBe(85);
      expect(builder.agentTools).toHaveLength(2);
    });

    it('FeedEvent can be constructed', () => {
      const event: FeedEvent = {
        id: '01EVENT',
        eventType: 'PROJECT_SHIPPED',
        targetType: 'project',
        targetId: '01PROJ',
        metadata: { title: 'New Launch' },
        createdAt: '2024-06-01T00:00:00Z',
      };
      expect(event.eventType).toBe('PROJECT_SHIPPED');
    });

    it('AuthPayload can be constructed', () => {
      const payload: AuthPayload = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: '01USER',
          username: 'testuser',
          displayName: 'Test User',
          email: 'test@example.com',
          onboardingCompleted: false,
        },
      };
      expect(payload.user.onboardingCompleted).toBe(false);
    });
  });

  describe('query response types', () => {
    it('GetBuilderData can hold a builder or null', () => {
      const withBuilder: GetBuilderData = {
        user: {
          id: '01B',
          username: 'u',
          displayName: 'U',
          avatarUrl: null,
          headline: null,
          primaryRole: null,
          timezone: null,
          availabilityStatus: 'JUST_BROWSING',
          builderScore: 0,
          bio: null,
          contactLinks: {},
          githubUsername: null,
          agentTools: [],
          agentWorkflowStyle: null,
          humanAgentRatio: null,
          createdAt: '',
          skills: [],
          projects: [],
        },
      };
      const withoutBuilder: GetBuilderData = { user: null };
      expect(withBuilder.user).not.toBeNull();
      expect(withoutBuilder.user).toBeNull();
    });

    it('GetBuildersData holds an array of builders', () => {
      const data: GetBuildersData = { builders: [] };
      expect(data.builders).toHaveLength(0);
    });

    it('GetProjectData can hold a project or null', () => {
      const data: GetProjectData = { project: null };
      expect(data.project).toBeNull();
    });

    it('GetProjectsData holds an array of projects', () => {
      const data: GetProjectsData = { projects: [] };
      expect(data.projects).toHaveLength(0);
    });

    it('GetTribeData can hold a tribe or null', () => {
      const data: GetTribeData = { tribe: null };
      expect(data.tribe).toBeNull();
    });

    it('GetTribesData holds an array of tribes', () => {
      const data: GetTribesData = { tribes: [] };
      expect(data.tribes).toHaveLength(0);
    });

    it('GetFeedData holds an array of feed events', () => {
      const data: GetFeedData = { feed: [] };
      expect(data.feed).toHaveLength(0);
    });
  });

  describe('mutation response types', () => {
    it('SignupData has correct nested structure', () => {
      const data: SignupData = {
        auth: {
          signup: {
            accessToken: 'at',
            refreshToken: 'rt',
            user: {
              id: '01',
              username: 'new',
              displayName: 'New',
              email: 'new@test.com',
              onboardingCompleted: false,
            },
          },
        },
      };
      expect(data.auth.signup.accessToken).toBe('at');
    });

    it('LoginData has correct nested structure', () => {
      const data: LoginData = {
        auth: {
          login: {
            accessToken: 'at',
            refreshToken: 'rt',
            user: {
              id: '01',
              username: 'existing',
              displayName: 'Existing',
              email: 'e@test.com',
              onboardingCompleted: true,
            },
          },
        },
      };
      expect(data.auth.login.user.onboardingCompleted).toBe(true);
    });

    it('RefreshTokenData has correct nested structure', () => {
      const data: RefreshTokenData = {
        auth: {
          refreshToken: {
            accessToken: 'new-at',
            refreshToken: 'new-rt',
            user: {
              id: '01',
              username: 'u',
              displayName: 'U',
              email: 'u@test.com',
              onboardingCompleted: true,
            },
          },
        },
      };
      expect(data.auth.refreshToken.accessToken).toBe('new-at');
    });

    it('LogoutData has correct nested structure', () => {
      const data: LogoutData = {
        auth: { logout: true },
      };
      expect(data.auth.logout).toBe(true);
    });
  });
});
