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

export type MemberStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'LEFT' | 'REMOVED';

export type AgentWorkflowStyle =
  | 'PAIR'
  | 'SWARM'
  | 'REVIEW'
  | 'AUTONOMOUS'
  | 'MINIMAL';

export interface AgentSetup {
  editors?: string[];
  agents?: string[];
  models?: string[];
  workflowStyles?: string[];
  setupNote?: string;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: SkillCategory;
}

export type CollaboratorStatus = 'pending' | 'confirmed' | 'declined';

export interface ProjectMilestone {
  id: string;
  title: string;
  date: string;
  milestoneType: 'start' | 'milestone' | 'deploy' | 'launch';
  createdAt: string;
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
  invitedAt?: string;
  confirmedAt?: string | null;
}

export interface ProjectOwner {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  primaryRole: string | null;
}

export interface PendingInvitation {
  projectId: string;
  projectTitle: string;
  role: string | null;
  inviter: ProjectOwner;
  invitedAt: string;
}

export interface InviteTokenInfo {
  projectTitle: string;
  projectId: string;
  inviterName: string;
  inviterAvatarUrl: string | null;
  role: string | null;
  expired: boolean;
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
  domains: string[];
  aiTools: string[];
  buildStyle: string[];
  services: string[];
  milestones?: ProjectMilestone[];
  thumbnailUrl?: string | null;
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

export interface NotificationPrefs {
  tribeInvites?: boolean;
  projectUpdates?: boolean;
  weeklyDigest?: boolean;
}

export interface PrivacyPrefs {
  profileVisibility?: 'public' | 'tribe_only' | 'hidden';
  showTimezone?: boolean;
  showAgentSetup?: boolean;
}

export interface Preferences {
  notifications?: NotificationPrefs;
  privacy?: PrivacyPrefs;
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
  agentTools: AgentSetup | string[];
  agentWorkflowStyle: AgentWorkflowStyle | null;
  humanAgentRatio: number | null;
  preferences: Preferences;
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
  | 'TRIBE_CREATED'
  | 'TRIBE_ANNOUNCEMENT'
  | 'COLLABORATION_CONFIRMED'
  | 'MEMBER_JOINED_TRIBE'
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

// Burn activity types
export interface BurnDay {
  date: string;
  tokens: number;
}

export interface BurnSummary {
  daysActive: number;
  totalTokens: number;
  activeWeeks: number;
  totalWeeks: number;
  weeklyStreak: number;
  dailyActivity: BurnDay[];
}

export interface BurnReceipt {
  projectId: string;
  totalTokens: number;
  durationWeeks: number;
  peakWeekTokens: number;
  dailyActivity: BurnDay[];
}

export interface GetBurnSummaryData {
  burnSummary: BurnSummary | null;
}

export interface GetBurnReceiptData {
  burnReceipt: BurnReceipt | null;
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

export interface SearchTribesData {
  searchTribes: Tribe[];
}

export interface GetFeedData {
  feed: FeedEvent[];
}

// API token types
export interface ApiTokenInfo {
  id: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreateApiTokenResult {
  id: string;
  name: string;
  token: string;
}

export interface GetMyApiTokensData {
  myApiTokens: ApiTokenInfo[];
}

export interface CreateApiTokenData {
  apiTokens: {
    createApiToken: CreateApiTokenResult;
  };
}

export interface RevokeApiTokenData {
  apiTokens: {
    revokeApiToken: boolean;
  };
}

export interface GetPendingInvitationsData {
  myPendingInvitations: PendingInvitation[];
}

export interface GetInviteTokenInfoData {
  inviteTokenInfo: InviteTokenInfo | null;
}

export interface GetTagSuggestionsData {
  tagSuggestions: string[];
}

export interface SearchUsersData {
  searchUsers: ProjectOwner[];
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

export interface UpdateProfileData {
  profile: {
    updateProfile: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      headline: string | null;
      bio: string | null;
      primaryRole: UserRole | null;
      timezone: string | null;
      availabilityStatus: AvailabilityStatus;
      contactLinks: Record<string, string>;
      agentTools: AgentSetup | string[];
      agentWorkflowStyle: AgentWorkflowStyle | null;
      humanAgentRatio: number | null;
      preferences: Preferences;
    };
  };
}
