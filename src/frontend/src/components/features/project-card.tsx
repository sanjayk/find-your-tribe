export interface ProjectCardProps {
  title: string;
  description: string;
  status: 'shipped' | 'in-progress';
  role?: string;
  agentTools?: string[];
  workflowStyle?: string;
  techStack?: string[];
}

export function ProjectCard({
  title,
  description,
  status,
  role,
  agentTools = [],
  workflowStyle,
  techStack = [],
}: ProjectCardProps) {
  const hasFooter = agentTools.length > 0 || techStack.length > 0 || !!role;

  return (
    <div className="card-lift bg-surface-elevated rounded-xl overflow-hidden shadow-sm">
      {/* Editorial zone — title, status, description */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="font-serif text-[20px] leading-tight text-ink">
            {title}
          </h3>
          {status === 'in-progress' ? (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-in-progress shrink-0 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-in-progress animate-pulse" />
              Building
            </span>
          ) : (
            <span className="text-[11px] font-mono text-shipped shrink-0 mt-1">
              Shipped
            </span>
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-ink-secondary line-clamp-2">
          {description}
        </p>
      </div>

      {/* Footer zone — tinted metadata */}
      {hasFooter && (
        <div className="bg-surface-secondary px-6 py-3.5 space-y-2">
          {/* Row 1: Agent tools + workflow style + role */}
          {(agentTools.length > 0 || !!role) && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {agentTools.map((tool) => (
                  <span
                    key={tool}
                    className="font-mono text-[11px] bg-accent-subtle text-accent px-2.5 py-0.5 rounded-md"
                  >
                    {tool}
                  </span>
                ))}
                {workflowStyle && (
                  <span className="text-[11px] text-ink-secondary">
                    {workflowStyle}
                  </span>
                )}
              </div>
              {role && (
                <span className="text-[12px] font-medium text-ink-secondary shrink-0">
                  {role}
                </span>
              )}
            </div>
          )}

          {/* Row 2: Tech stack — quiet, secondary */}
          {techStack.length > 0 && (
            <p className="font-mono text-[10px] text-ink-tertiary">
              {techStack.join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
