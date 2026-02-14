import Link from 'next/link';

import type { Endorsement } from '@/lib/graphql/types';

interface EndorsementCardProps {
  endorsement: Endorsement;
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

function formatRole(role: string | null): string {
  if (!role) return 'Builder';
  const map: Record<string, string> = {
    ENGINEER: 'Engineer',
    DESIGNER: 'Designer',
    PM: 'Product Manager',
    MARKETER: 'Marketer',
    GROWTH: 'Growth',
    FOUNDER: 'Founder',
    OTHER: 'Builder',
  };
  return map[role] || role;
}

export function EndorsementCard({ endorsement }: EndorsementCardProps) {
  const { fromUser, text, project } = endorsement;
  const avatar = getAvatarColor(fromUser.username);

  return (
    <div className="bg-surface-elevated rounded-xl p-6 shadow-sm space-y-4">
      <p className="font-serif text-[15px] leading-relaxed text-ink italic">
        &ldquo;{text}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <Link href={`/profile/${fromUser.username}`}>
          {fromUser.avatarUrl ? (
            <img
              src={fromUser.avatarUrl}
              alt={fromUser.displayName}
              className={`w-8 h-8 rounded-full object-cover ${avatar.bg}`}
            />
          ) : (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${avatar.bg} ${avatar.text}`}
            >
              <span className="text-[11px] font-medium">
                {getInitials(fromUser.displayName)}
              </span>
            </div>
          )}
        </Link>
        <div>
          <Link
            href={`/profile/${fromUser.username}`}
            className="text-[13px] font-medium text-ink hover:text-accent transition-colors"
          >
            {fromUser.displayName}
          </Link>
          <p className="text-[11px] text-ink-tertiary">
            {formatRole(fromUser.primaryRole)}
            {project && (
              <> &middot; on {project.title}</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
