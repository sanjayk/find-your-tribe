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
  };
  role: string | null;
  status: string;
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
  collaborators?: Collaborator[];
}

export interface TribeMember {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  role: MemberRole;
  status: MemberStatus;
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
  members: TribeMember[];
  openRoles: OpenRole[];
}

export interface Endorsement {
  id: string;
  text: string;
  createdAt: string;
  fromUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    primaryRole: UserRole | null;
  };
  project: {
    id: string;
    title: string;
  } | null;
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
  endorsements?: Endorsement[];
}

export interface GetBuilderData {
  user: Builder | null;
}

export interface GetBuildersData {
  builders: Builder[];
}
