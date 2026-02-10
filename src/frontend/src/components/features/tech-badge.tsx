import React from 'react';

interface TechBadgeProps {
  technologies: string[];
  variant: 'pill' | 'inline';
}

export function TechBadge({ technologies, variant }: TechBadgeProps) {
  if (technologies.length === 0) {
    return <div />;
  }

  if (variant === 'pill') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {technologies.map((tech, index) => (
          <span
            key={index}
            className="font-mono text-[11px] bg-surface-secondary text-ink-secondary px-2.5 py-1 rounded-md"
          >
            {tech}
          </span>
        ))}
      </div>
    );
  }

  // inline variant
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {technologies.map((tech, index) => (
        <React.Fragment key={index}>
          <span className="font-mono text-[11px] text-ink-tertiary">
            {tech}
          </span>
          {index < technologies.length - 1 && (
            <span className="text-ink-tertiary/30">
              /
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
