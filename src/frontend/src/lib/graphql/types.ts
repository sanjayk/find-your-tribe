export type AvailabilityStatus =
  | 'OPEN_TO_TRIBE'
  | 'AVAILABLE_FOR_PROJECTS'
  | 'JUST_BROWSING';

export type ProjectStatus = 'SHIPPED' | 'IN_PROGRESS' | 'ARCHIVED';

export type UserRole =
  | 'ENGINEER'
  | 'DESIGNER'
  | 'PM'
  | 'MARKETER'
  | 'GROWTH'
  | 'FOUNDER'
  | 'OTHER';

export type SkillCategory =
  | 'ENGINEERING'
  | 'DESIGN'
  | 'PRODUCT'
  | 'MARKETING'
  | 'GROWTH'
  | 'DATA'
  | 'OPERATIONS'
  | 'OTHER';

export type TribeStatus = 'OPEN' | 'ACTIVE' | 'ALUMNI';

export type MemberRole = 'OWNER' | 'MEMBER';

export type MemberStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';

export type AgentWorkflowStyle =
  | 'PAIR'
  | 'SWARM'
  | 'REVIEW'
  | 'AUTONOMOUS'
  | 'MINIMAL';

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: SkillCategory;
}

export interface Collaborator {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    headline: string | null;
    primaryRole: string | null;
  };
  role: string | null;
  status: string;
}

export interface ProjectOwner {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  primaryRole: string | null;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  role: string | null;
  techStack: string[];
  links: Record<string, string>;
  impactMetrics: Record<string, unknown>;
  githubRepoFullName: string | null;
  githubStars: number | null;
  createdAt: string;
  updatedAt: string;
  owner?: ProjectOwner;
  collaborators?: Collaborator[];
}

export interface TribeMember {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    headline?: string | null;
    primaryRole?: string | null;
  };
  role: MemberRole;
  status: MemberStatus;
  joinedAt?: string;
}

export interface OpenRole {
  id: string;
  title: string;
  skillsNeeded: string[];
  filled: boolean;
}

export interface Tribe {
  id: string;
  name: string;
  mission: string | null;
  status: TribeStatus;
  maxMembers: number;
  createdAt?: string;
  updatedAt?: string;
  owner?: ProjectOwner;
  members: TribeMember[];
  openRoles: OpenRole[];
}

export interface Builder {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  primaryRole: UserRole | null;
  timezone: string | null;
  availabilityStatus: AvailabilityStatus;
  builderScore: number;
  bio: string | null;
  contactLinks: Record<string, string>;
  githubUsername: string | null;
  agentTools: string[];
  agentWorkflowStyle: AgentWorkflowStyle | null;
  humanAgentRatio: number | null;
  createdAt: string;
  skills: Skill[];
  projects: Project[];
  tribes?: Tribe[];
}

export interface GetBuilderData {
  user: Builder | null;
}

export interface GetBuildersData {
  builders: Builder[];
}

export type EventType =
  | 'PROJECT_SHIPPED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATE'
  | 'TRIBE_FORMED'
  | 'TRIBE_ANNOUNCEMENT'
  | 'COLLABORATOR_JOINED'
  | 'BUILDER_JOINED';

export interface FeedEvent {
  id: string;
  eventType: EventType;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    onboardingCompleted: boolean;
  };
}

// Query response types
export interface GetProjectData {
  project: Project | null;
}

export interface GetProjectsData {
  projects: Project[];
}

export interface GetTribeData {
  tribe: Tribe | null;
}

export interface GetTribesData {
  tribes: Tribe[];
}

export interface GetFeedData {
  feed: FeedEvent[];
}

// Mutation response types (namespaced)
export interface SignupData {
  auth: { signup: AuthPayload };
}

export interface LoginData {
  auth: { login: AuthPayload };
}

export interface RefreshTokenData {
  auth: { refreshToken: AuthPayload };
}

export interface LogoutData {
  auth: { logout: boolean };
}
