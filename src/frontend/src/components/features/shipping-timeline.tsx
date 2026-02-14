import type { Project } from '@/lib/graphql/types';

interface ShippingTimelineProps {
  projects: Project[];
}

export function ShippingTimeline({ projects }: ShippingTimelineProps) {
  const sorted = [...projects].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  if (sorted.length === 0) return null;

  const earliest = new Date(sorted[0].createdAt).getTime();
  const latest = new Date(sorted[sorted.length - 1].createdAt).getTime();
  // Add 20% padding to the right so the latest dot isn't at the very edge
  const range = (latest - earliest) * 1.2 || 1;

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono font-medium tracking-[0.15em] text-ink-tertiary uppercase">
        Shipping Timeline
      </p>
      <div className="bg-surface-elevated rounded-xl p-6 shadow-sm">
        <div className="relative h-12">
          {/* Timeline axis */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-ink-tertiary/20 -translate-y-1/2" />

          {/* Project dots */}
          {sorted.map((project) => {
            const offset = new Date(project.createdAt).getTime() - earliest;
            const pct = (offset / range) * 100;
            const isShipped = project.status === 'SHIPPED';

            return (
              <div
                key={project.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                style={{ left: `${Math.min(Math.max(pct, 2), 98)}%` }}
              >
                <div
                  className={`w-3 h-3 rounded-full transition-transform group-hover:scale-150 ${
                    isShipped
                      ? 'bg-accent'
                      : 'bg-transparent ring-2 ring-in-progress'
                  }`}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  <span className="text-[11px] bg-surface-inverse text-ink-inverse px-2 py-1 rounded">
                    {project.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Date labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-ink-tertiary font-mono">
            {new Date(sorted[0].createdAt).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span className="text-[10px] text-ink-tertiary font-mono">
            {new Date(sorted[sorted.length - 1].createdAt).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
