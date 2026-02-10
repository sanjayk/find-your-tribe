import { Star } from 'lucide-react';

export interface ProjectCardProps {
  title: string;
  description: string;
  techStack: string[];
  collaborators: {
    name: string;
    initials: string;
    avatarColor: string;
  }[];
  stars?: number;
  shippedDate?: string;
  status: 'shipped' | 'in-progress';
  gradientColors: {
    from: string;
    via: string;
    to: string;
  };
  variant: 'hero' | 'compact';
}

export function ProjectCard({
  title,
  description,
  techStack,
  collaborators,
  stars,
  shippedDate,
  status,
  gradientColors,
  variant,
}: ProjectCardProps) {
  if (variant === 'hero') {
    return (
      <div className="card-lift bg-surface-elevated rounded-xl overflow-hidden shadow-md group">
        {/* Thumbnail — abstract pattern */}
        <div className="aspect-[16/9] relative overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradientColors.from} ${gradientColors.via} ${gradientColors.to}`}
          ></div>
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          ></div>
          <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
            {shippedDate && (
              <span className="text-[12px] font-medium text-white/70 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
                Shipped {shippedDate}
              </span>
            )}
            {stars !== undefined && (
              <div className="flex items-center gap-1.5 text-white/70 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <Star className="w-3.5 h-3.5" />
                <span className="text-[12px] font-medium">{stars}</span>
              </div>
            )}
          </div>
        </div>
        <div className="p-6 md:p-8">
          <h3 className="font-serif text-[28px] leading-tight text-ink mb-3">
            {title}
          </h3>
          <p className="text-[15px] leading-relaxed text-ink-secondary mb-5">
            {description}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-6">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="font-mono text-[11px] bg-surface-secondary text-ink-secondary px-2.5 py-1 rounded-md"
              >
                {tech}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {collaborators.map((collaborator, index) => (
              <div key={collaborator.name} className="flex items-center gap-3">
                {index > 0 && <span className="text-ink-tertiary">+</span>}
                <div className={`avatar avatar-sm ${collaborator.avatarColor}`}>
                  <span className="text-[11px]">{collaborator.initials}</span>
                </div>
                <span className="text-[13px] text-ink-secondary">
                  {collaborator.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Compact variant
  return (
    <div className="card-lift bg-surface-elevated rounded-xl overflow-hidden shadow-md flex-1">
      <div className="aspect-[16/7] relative overflow-hidden">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradientColors.from} ${gradientColors.via} ${gradientColors.to}`}
        ></div>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(45deg, white 25%, transparent 25%, transparent 75%, white 75%), linear-gradient(45deg, white 25%, transparent 25%, transparent 75%, white 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px',
          }}
        ></div>
        <div className="absolute top-3 right-3">
          {status === 'in-progress' && (
            <span className="text-[11px] font-medium text-white/80 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
              In Progress
            </span>
          )}
        </div>
        {status === 'shipped' && stars !== undefined && (
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-white/70 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <Star className="w-3 h-3" />
            <span className="text-[11px] font-medium">{stars}</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-serif text-xl leading-tight text-ink mb-2">
          {title}
        </h3>
        <p className="text-[13px] leading-relaxed text-ink-secondary mb-4">
          {description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {collaborators[0] && (
              <>
                <div
                  className={`avatar avatar-xs ${collaborators[0].avatarColor}`}
                >
                  <span className="text-[9px]">
                    {collaborators[0].initials}
                  </span>
                </div>
                <span className="text-[12px] text-ink-tertiary">
                  {collaborators[0].name}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {techStack.map((tech, index) => (
              <div key={tech} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span className="text-ink-tertiary/30">/</span>
                )}
                <span className="font-mono text-[10px] text-ink-tertiary">
                  {tech}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
