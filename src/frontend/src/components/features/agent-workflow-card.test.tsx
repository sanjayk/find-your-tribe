import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AgentWorkflowCard } from './agent-workflow-card';

describe('AgentWorkflowCard', () => {
  it('renders nothing when all fields are empty/null', () => {
    const { container } = render(
      <AgentWorkflowCard agentTools={[]} workflowStyle={null} humanAgentRatio={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders agent tools as pills', () => {
    render(
      <AgentWorkflowCard
        agentTools={['Claude', 'Cursor']}
        workflowStyle={null}
        humanAgentRatio={null}
      />
    );
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });

  it('renders workflow style badge', () => {
    render(
      <AgentWorkflowCard
        agentTools={[]}
        workflowStyle="PAIR"
        humanAgentRatio={null}
      />
    );
    expect(screen.getByText('Pair programs with AI')).toBeInTheDocument();
  });

  it('renders human/AI ratio bar', () => {
    render(
      <AgentWorkflowCard
        agentTools={[]}
        workflowStyle={null}
        humanAgentRatio={0.45}
      />
    );
    expect(screen.getByText('Human 45%')).toBeInTheDocument();
    expect(screen.getByText('AI 55%')).toBeInTheDocument();
  });

  it('renders all three sections together', () => {
    render(
      <AgentWorkflowCard
        agentTools={['Claude', 'v0']}
        workflowStyle="SWARM"
        humanAgentRatio={0.55}
      />
    );
    expect(screen.getByText('Agent Workflow')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('v0')).toBeInTheDocument();
    expect(screen.getByText('Swarm delegation')).toBeInTheDocument();
    expect(screen.getByText('Human 55%')).toBeInTheDocument();
    expect(screen.getByText('AI 45%')).toBeInTheDocument();
  });
});
