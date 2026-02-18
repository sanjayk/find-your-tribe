'use client';

import { useState } from 'react';
import { Popover } from 'radix-ui';

export interface AgentPanelProps {
  editors: string[];
  agents: string[];
  models: string[];
  workflowStyles: string[];
  humanRatio: number;     // 0-100
  setupNote?: string;
}

const MAX_VISIBLE = 3;

function PillList({ items, testIdPrefix }: { items: string[]; testIdPrefix: string }) {
  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.slice(MAX_VISIBLE);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {visible.map((item) => (
        <span
          key={item}
          className="bg-surface-secondary text-[12px] font-medium text-ink px-2.5 py-1 rounded-full"
          data-testid={`${testIdPrefix}-pill`}
        >
          {item}
        </span>
      ))}
      {overflow.length > 0 && (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
              data-testid={`${testIdPrefix}-overflow`}
            >
              +{overflow.length} more
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="bg-surface-elevated rounded-lg shadow-md p-3 z-50"
              sideOffset={6}
              align="start"
            >
              <div className="flex flex-col gap-1.5">
                {overflow.map((item) => (
                  <span
                    key={item}
                    className="text-[12px] font-medium text-ink"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
}

export function AgentPanel({ editors, agents, models, workflowStyles, humanRatio, setupNote }: AgentPanelProps) {
  const clampedHuman = Math.min(100, Math.max(0, humanRatio));
  const aiRatio = 100 - clampedHuman;

  const hasEditors = editors.length > 0;
  const hasAgents = agents.length > 0;
  const hasModels = models.length > 0;
  const hasWorkflow = workflowStyles.length > 0;

  // Build visible columns
  const columns: { label: string; content: React.ReactNode }[] = [];

  if (hasEditors) {
    columns.push({
      label: 'Editors',
      content: <PillList items={editors} testIdPrefix="editor" />,
    });
  }
  if (hasAgents) {
    columns.push({
      label: 'Agents',
      content: <PillList items={agents} testIdPrefix="agent" />,
    });
  }
  if (hasModels) {
    columns.push({
      label: 'Models',
      content: <PillList items={models} testIdPrefix="model" />,
    });
  }
  if (hasWorkflow || humanRatio !== undefined) {
    columns.push({
      label: 'Workflow',
      content: (
        <div className="flex flex-col gap-1.5">
          {hasWorkflow && (
            <span className="text-[12px] text-ink-secondary" data-testid="workflow-style">
              {workflowStyles.join(' / ')}
            </span>
          )}
          <div className="flex items-center gap-1.5" data-testid="ratio-bar-container">
            <div
              className="flex overflow-hidden rounded-sm w-[48px] h-[3px] bg-surface-secondary"
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
              className="font-mono text-ink-tertiary text-[10px]"
              data-testid="ratio-label"
            >
              {clampedHuman}/{aiRatio}
            </span>
          </div>
        </div>
      ),
    });
  }

  return (
    <div data-testid="agent-panel" className="bg-accent-subtle/40 rounded-2xl px-6 py-5">
      {/* Section label */}
      <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-accent mb-4">
        How I build
      </div>

      {/* Category columns */}
      <div
        className="grid grid-cols-2 gap-y-4 lg:flex lg:justify-evenly lg:divide-x lg:divide-ink-tertiary/15"
        data-testid="agent-tools"
      >
        {columns.map((col) => (
          <div key={col.label} className="flex flex-col gap-2 lg:px-6 lg:first:pl-0 lg:last:pr-0">
            <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-ink-tertiary">
              {col.label}
            </span>
            {col.content}
          </div>
        ))}
      </div>

      {/* Setup note */}
      {setupNote && (
        <p
          className="text-[13px] text-ink-secondary leading-relaxed mt-4"
          data-testid="setup-note"
        >
          {setupNote}
        </p>
      )}
    </div>
  );
}
