export interface AgentTool {
  name: string;          // e.g. "Claude Code"
  capabilities: string;  // e.g. "backend, testing"
}

export interface AgentPanelProps {
  tools: AgentTool[];
  workflowStyle: string;  // e.g. "Pair builder"
  humanRatio: number;     // 0-100
}

export function AgentPanel({ tools, workflowStyle, humanRatio }: AgentPanelProps) {
  const clampedHuman = Math.min(100, Math.max(0, humanRatio));
  const aiRatio = 100 - clampedHuman;

  return (
    <div
      className="rounded-xl px-6 py-5 flex items-baseline gap-8 flex-wrap bg-accent-subtle"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(99, 102, 241, 0.07) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }}
    >
      {/* Label */}
      <span className="text-[10px] font-medium uppercase tracking-[0.05em] text-accent min-w-[70px]">
        How I Build
      </span>

      {/* Tool list */}
      {tools.length > 0 && (
        <div className="flex gap-5 flex-wrap" data-testid="agent-tools">
          {tools.map((tool) => (
            <div key={tool.name} className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-medium text-ink">
                {tool.name}
              </span>
              <span className="text-[11px] text-ink-tertiary">
                {tool.capabilities}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Workflow + ratio pushed right */}
      <div className="ml-auto flex items-center gap-3 text-[12px] text-ink-secondary">
        <span data-testid="workflow-style">{workflowStyle}</span>
        <div className="flex items-center gap-1.5" data-testid="ratio-bar-container">
          <div
            className="flex overflow-hidden rounded-sm"
            style={{ width: '60px', height: '3px', background: 'var(--color-surface-secondary)' }}
            data-testid="ratio-bar"
          >
            <div
              data-testid="ratio-human"
              style={{ width: `${clampedHuman}%`, background: 'var(--color-ink-tertiary)' }}
            />
            <div
              data-testid="ratio-ai"
              style={{ width: `${aiRatio}%`, background: 'var(--color-accent)' }}
            />
          </div>
          <span
            className="font-mono text-ink-tertiary"
            style={{ fontSize: '10px' }}
            data-testid="ratio-label"
          >
            {clampedHuman}% human
          </span>
        </div>
      </div>
    </div>
  );
}
