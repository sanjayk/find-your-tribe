import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface BuilderCardProps {
  name: string;
  initials: string;
  title: string;
  bio?: string;
  skills: string[];
  score: number;
  status: 'open' | 'collaborating' | 'heads-down';
  avatarColor: string;
  avatarTextColor: string;
  avatarUrl?: string | null;
  variant: 'featured' | 'list';
}

const statusConfig = {
  open: {
    label: 'Open to collaborate',
    variant: 'shipped' as const,
    dotColor: 'bg-shipped',
  },
  collaborating: {
    label: 'Collaborating',
    variant: 'shipped' as const,
    dotColor: 'bg-shipped',
  },
  'heads-down': {
    label: 'Heads down',
    variant: 'default' as const,
    dotColor: 'bg-ink-tertiary',
  },
};

function BuilderCard({
  name,
  initials,
  title,
  bio,
  skills,
  score,
  status,
  avatarColor,
  avatarTextColor,
  avatarUrl,
  variant,
}: BuilderCardProps) {
  const statusInfo = statusConfig[status];

  if (variant === 'featured') {
    return (
      <div className="card-lift bg-surface-elevated rounded-xl p-6 md:p-8 shadow-md">
        {/* Header with avatar and name */}
        <div className="flex items-center gap-4 mb-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className={cn('avatar avatar-lg object-cover', avatarColor)}
            />
          ) : (
            <div className={cn('avatar avatar-lg', avatarColor, avatarTextColor)}>
              <span className="text-xl">{initials}</span>
            </div>
          )}
          <div>
            <h3 className="font-serif text-[24px] leading-tight text-ink">
              {name}
            </h3>
            <p className="text-[13px] text-ink-tertiary mt-0.5">{title}</p>
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-[15px] leading-relaxed text-ink-secondary mb-6">
            {bio}
          </p>
        )}

        {/* Skills as badge pills */}
        <div className="flex flex-wrap gap-1.5 mb-8">
          {skills.map((skill) => (
            <span
              key={skill}
              className="font-mono text-[11px] bg-surface-secondary text-ink-secondary px-2.5 py-1 rounded-md"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Footer with status and score */}
        <div className="flex items-center justify-between">
          <Badge variant={statusInfo.variant}>
            <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dotColor)} />
            {statusInfo.label}
          </Badge>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[32px] font-medium text-accent leading-none">
              {score}
            </span>
            <span className="text-[11px] text-ink-tertiary">score</span>
          </div>
        </div>
      </div>
    );
  }

  // List variant
  return (
    <div className="pb-5 border-b border-ink/5">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className={cn('avatar avatar-md object-cover', avatarColor)}
          />
        ) : (
          <div className={cn('avatar avatar-md', avatarColor, avatarTextColor)}>
            <span className="text-sm">{initials}</span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-serif text-lg leading-tight text-ink">{name}</h3>
          <p className="text-[12px] text-ink-tertiary">{title}</p>
        </div>
        <span className="font-mono text-[22px] font-medium text-accent/80">
          {score}
        </span>
      </div>

      {/* Skills and status row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill, index) => (
            <React.Fragment key={skill}>
              <span className="font-mono text-[11px] text-ink-tertiary">
                {skill}
              </span>
              {index < skills.length - 1 && (
                <span className="text-ink-tertiary/30">/</span>
              )}
            </React.Fragment>
          ))}
        </div>
        <Badge variant={statusInfo.variant}>
          <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dotColor)} />
          {statusInfo.label}
        </Badge>
      </div>
    </div>
  );
}

export default BuilderCard;
