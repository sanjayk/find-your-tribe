export interface WitnessProject {
  name: string;
  role: string; // what they did, e.g. "design", "API"
}

export interface Witness {
  initials: string;
  name: string;
  role: string; // their title, e.g. "Product Designer"
  projects: WitnessProject[];
}

export interface WitnessCreditsProps {
  witnesses: Witness[];
}

export function WitnessCredits({ witnesses }: WitnessCreditsProps) {
  if (witnesses.length === 0) return null;

  return (
    <section>
      {/* Section label with accent line */}
      <div className="accent-line text-[12px] font-medium uppercase tracking-[0.06em] text-ink-tertiary mb-6">
        Collaborators
      </div>

      {/* Credits list */}
      <div className="flex flex-col" data-testid="credits-list">
        {witnesses.map((witness, index) => (
          <div
            key={witness.name}
            className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-4 py-[14px]"
            style={index > 0 ? { boxShadow: '0 -1px 0 var(--color-surface-secondary)' } : undefined}
            data-testid="credit-row"
          >
            {/* Identity column */}
            <div className="flex items-center gap-2.5 lg:min-w-[220px]">
              <div
                className="w-7 h-7 rounded-full bg-surface-secondary flex items-center justify-center shrink-0 text-[9px] font-medium text-ink-secondary"
                data-testid="credit-avatar"
              >
                {witness.initials}
              </div>
              <span className="font-medium text-[14px]" data-testid="credit-name">
                {witness.name}
              </span>
            </div>

            {/* Role column */}
            <span
              className="font-mono text-ink-tertiary lg:min-w-[140px] text-[12px]"
              data-testid="credit-role"
            >
              {witness.role}
            </span>

            {/* Projects column */}
            <div className="flex flex-wrap gap-1.5 flex-1" data-testid="credit-projects">
              {witness.projects.map((project, pIndex) => (
                <span key={project.name} className="inline-flex items-baseline gap-1.5">
                  {pIndex > 0 && (
                    <span className="text-[13px] text-ink-secondary" data-testid="middot-separator">
                      &middot;
                    </span>
                  )}
                  <span className="text-[13px] text-ink-secondary">
                    {project.name}{' '}
                    <span className="text-[11px] text-ink-tertiary">({project.role})</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
