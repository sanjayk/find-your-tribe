/* ─── Types ─── */

export interface FeedEventMetadata {
  actor_name?: string;
  actor_username?: string;
  project_title?: string;
  tech_stack?: string[];
  tribe_name?: string;
  mission?: string;
  skills?: string[];
  content?: string;
  member_name?: string;
  collaborator_name?: string;
  user_name?: string;
}

export interface AvatarColor {
  bg: string;
  text: string;
}

export interface GradientClasses {
  from: string;
  via: string;
  to: string;
}

/* ─── Avatar palette ─── */

const AVATAR_PALETTE: AvatarColor[] = [
  { bg: 'bg-accent-subtle', text: 'text-accent' },
  { bg: 'bg-shipped-subtle', text: 'text-shipped' },
  { bg: 'bg-in-progress-subtle', text: 'text-in-progress' },
  { bg: 'bg-surface-inverse', text: 'text-ink-inverse' },
  { bg: 'bg-accent-muted/30', text: 'text-accent' },
  { bg: 'bg-surface-secondary', text: 'text-ink-secondary' },
];

/* ─── Gradient palette ─── */

const GRADIENT_PALETTE: GradientClasses[] = [
  { from: 'from-indigo-400', via: 'via-purple-400', to: 'to-pink-400' },
  { from: 'from-emerald-400', via: 'via-teal-400', to: 'to-cyan-400' },
  { from: 'from-amber-400', via: 'via-orange-400', to: 'to-red-400' },
  { from: 'from-blue-400', via: 'via-indigo-400', to: 'to-violet-400' },
];

/* ─── Action text map ─── */

const ACTION_TEXT: Record<string, string> = {
  PROJECT_SHIPPED: 'shipped',
  PROJECT_CREATED: 'started building',
  PROJECT_UPDATE: 'posted an update',
  TRIBE_CREATED: 'formed a tribe',
  TRIBE_ANNOUNCEMENT: 'announced',
  COLLABORATION_CONFIRMED: 'joined a project',
  MEMBER_JOINED_TRIBE: 'joined a tribe',
  BUILDER_JOINED: 'joined',
};

/* ─── Utilities ─── */

/**
 * Simple deterministic hash — sum of char codes.
 * Exported for testability.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += str.charCodeAt(i);
  }
  return hash;
}

/**
 * Extract initials from metadata name fields.
 * Fallback chain: actor_name → user_name → member_name → actor_username (first 2 chars) → '?'
 */
export function getInitials(metadata: FeedEventMetadata): string {
  const nameToInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  };

  if (metadata.actor_name) return nameToInitials(metadata.actor_name);
  if (metadata.user_name) return nameToInitials(metadata.user_name);
  if (metadata.member_name) return nameToInitials(metadata.member_name);
  if (metadata.actor_username) return metadata.actor_username.slice(0, 2);
  return '?';
}

/**
 * Deterministic avatar color from name string.
 * Returns neutral palette (index 5) when name is undefined or empty.
 */
export function getAvatarColor(name: string | undefined): AvatarColor {
  if (!name) return AVATAR_PALETTE[5];
  return AVATAR_PALETTE[hashString(name) % AVATAR_PALETTE.length];
}

/**
 * Deterministic gradient classes from project title.
 * Returns empty strings when title is undefined or empty.
 */
export function getGradientClasses(title: string | undefined): GradientClasses {
  if (!title) return { from: '', via: '', to: '' };
  return GRADIENT_PALETTE[hashString(title) % GRADIENT_PALETTE.length];
}

/**
 * Maps event type to action text per design spec.
 * Returns empty string for unknown types.
 */
export function getActionText(eventType: string): string {
  return ACTION_TEXT[eventType] ?? '';
}

/**
 * Maps targetType + targetId to an internal URL.
 * Returns null when targetType is unknown or targetId is missing.
 */
export function getLinkTarget(
  targetType: string | null,
  targetId: string | null,
): string | null {
  if (!targetType || !targetId) return null;
  switch (targetType) {
    case 'project':
      return `/project/${targetId}`;
    case 'tribe':
      return `/tribe/${targetId}`;
    case 'user':
      return `/profile/${targetId}`;
    default:
      return null;
  }
}

/**
 * Returns the best available display name from metadata.
 * Fallback chain: actor_name → user_name → member_name → actor_username → 'A builder'
 */
export function getActorDisplayName(metadata: FeedEventMetadata): string {
  return (
    metadata.actor_name ??
    metadata.user_name ??
    metadata.member_name ??
    metadata.actor_username ??
    'A builder'
  );
}
