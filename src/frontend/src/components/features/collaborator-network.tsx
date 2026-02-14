import Link from 'next/link';

import type { Project } from '@/lib/graphql/types';

interface CollaboratorNetworkProps {
  projects: Project[];
  selfUsername: string;
}

const AVATAR_COLORS = [
  { bg: 'bg-[#e8ddd3]', text: 'text-[#6b4c3b]' },
  { bg: 'bg-[#dde0d5]', text: 'text-[#4a5240]' },
  { bg: 'bg-[#e2d5cd]', text: 'text-[#7a5a4a]' },
  { bg: 'bg-[#d9d5d0]', text: 'text-[#5c5650]' },
  { bg: 'bg-[#e0d3d0]', text: 'text-[#7a5555]' },
  { bg: 'bg-[#dfd8c8]', text: 'text-[#6b5e3e]' },
];

function getAvatarColor(username: string) {
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CollaboratorNetwork({
  projects,
  selfUsername,
}: CollaboratorNetworkProps) {
  // Deduplicate collaborators across all projects, excluding self
  const seen = new Set<string>();
  const collaborators: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }[] = [];

  for (const project of projects) {
    for (const collab of project.collaborators || []) {
      if (collab.user.username !== selfUsername && !seen.has(collab.user.username)) {
        seen.add(collab.user.username);
        collaborators.push({
          username: collab.user.username,
          displayName: collab.user.displayName,
          avatarUrl: collab.user.avatarUrl,
        });
      }
    }
  }

  if (collaborators.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono font-medium tracking-[0.08em] text-ink-tertiary uppercase">
        Built With
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Overlapping avatars */}
        <div className="flex -space-x-2">
          {collaborators.map((collab) => {
            const avatar = getAvatarColor(collab.username);
            return (
              <Link
                key={collab.username}
                href={`/profile/${collab.username}`}
                className="relative hover:z-10 transition-transform hover:scale-110"
              >
                {collab.avatarUrl ? (
                  <img
                    src={collab.avatarUrl}
                    alt={collab.displayName}
                    className={`w-9 h-9 rounded-full object-cover ring-2 ring-surface ${avatar.bg}`}
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ring-2 ring-surface ${avatar.bg} ${avatar.text}`}
                  >
                    <span className="text-[11px] font-medium">
                      {getInitials(collab.displayName)}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {collaborators.map((collab) => (
            <Link
              key={collab.username}
              href={`/profile/${collab.username}`}
              className="text-[13px] text-ink-secondary hover:text-accent transition-colors"
            >
              {collab.displayName}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
