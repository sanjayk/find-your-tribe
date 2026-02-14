import type { AgentWorkflowStyle } from '@/lib/graphql/types';

interface AgentWorkflowCardProps {
  agentTools: string[];
  workflowStyle: AgentWorkflowStyle | null;
  humanAgentRatio: number | null;
}

const WORKFLOW_LABELS: Record<string, string> = {
  PAIR: 'Pair programs with AI',
  SWARM: 'Swarm delegation',
  REVIEW: 'AI-assisted review',
  AUTONOMOUS: 'Autonomous agents',
  MINIMAL: 'Minimal AI usage',
};

export function AgentWorkflowCard({
  agentTools,
  workflowStyle,
  humanAgentRatio,
}: AgentWorkflowCardProps) {
  const hasData = agentTools.length > 0 || workflowStyle || humanAgentRatio !== null;
  if (!hasData) return null;

  const humanPct = humanAgentRatio !== null ? Math.round(humanAgentRatio * 100) : null;
  const aiPct = humanPct !== null ? 100 - humanPct : null;

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono font-medium tracking-[0.08em] text-ink-tertiary uppercase">
        Agent Workflow
      </p>

      {/* AI tool pills */}
      {agentTools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {agentTools.map((tool) => (
            <span
              key={tool}
              className="font-mono text-[11px] bg-accent-subtle text-accent px-2.5 py-1 rounded-md"
            >
              {tool}
            </span>
          ))}
        </div>
      )}

      {/* Workflow style badge */}
      {workflowStyle && (
        <span className="inline-block text-[12px] text-ink-secondary bg-surface-secondary px-2.5 py-1 rounded-md">
          {WORKFLOW_LABELS[workflowStyle] || workflowStyle}
        </span>
      )}

      {/* Human/AI ratio bar */}
      {humanPct !== null && aiPct !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-ink-tertiary">
            <span>Human {humanPct}%</span>
            <span>AI {aiPct}%</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-secondary">
            <div
              className="bg-[#a08870] rounded-l-full"
              style={{ width: `${humanPct}%` }}
            />
            <div
              className="bg-accent-muted rounded-r-full"
              style={{ width: `${aiPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
