import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AgentPanel } from './agent-panel';

const mockTools = [
  { name: 'Claude Code', capabilities: 'backend, testing' },
  { name: 'Cursor', capabilities: 'frontend, refactor' },
];

describe('AgentPanel', () => {
  it('renders without crashing', () => {
    render(<AgentPanel tools={mockTools} workflowStyle="Pair builder" humanRatio={30} />);
  });

  it('renders all tool names', () => {
    render(<AgentPanel tools={mockTools} workflowStyle="Pair builder" humanRatio={30} />);
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });

  it('renders tool capabilities', () => {
    render(<AgentPanel tools={mockTools} workflowStyle="Pair builder" humanRatio={30} />);
    expect(screen.getByText('backend, testing')).toBeInTheDocument();
    expect(screen.getByText('frontend, refactor')).toBeInTheDocument();
  });

  it('renders workflow style', () => {
    render(<AgentPanel tools={mockTools} workflowStyle="Pair builder" humanRatio={30} />);
    expect(screen.getByTestId('workflow-style')).toHaveTextContent('Pair builder');
  });

  it('renders the "HOW I BUILD" label', () => {
    render(<AgentPanel tools={mockTools} workflowStyle="Pair builder" humanRatio={30} />);
    expect(screen.getByText(/how i build/i)).toBeInTheDocument();
  });

  it('renders ratio bar with correct proportions', () => {
    render(<AgentPanel tools={mockTools} workflowStyle="Pair builder" humanRatio={30} />);
    const humanBar = screen.getByTestId('ratio-human');
    const aiBar = screen.getByTestId('ratio-ai');
    expect(humanBar.style.width).toBe('30%');
    expect(aiBar.style.width).toBe('70%');
  });

  it('renders ratio label with human percentage', () => {
    render(<AgentPanel tools={mockTools} workflowStyle="Pair builder" humanRatio={30} />);
    const label = screen.getByTestId('ratio-label');
    expect(label.textContent).toBe('30% human');
  });

  it('clamps humanRatio below 0 to 0', () => {
    render(<AgentPanel tools={mockTools} workflowStyle="Pair builder" humanRatio={-10} />);
    const humanBar = screen.getByTestId('ratio-human');
    expect(humanBar.style.width).toBe('0%');
  });

  it('clamps humanRatio above 100 to 100', () => {
    render(<AgentPanel tools={mockTools} workflowStyle="Pair builder" humanRatio={120} />);
    const humanBar = screen.getByTestId('ratio-human');
    const aiBar = screen.getByTestId('ratio-ai');
    expect(humanBar.style.width).toBe('100%');
    expect(aiBar.style.width).toBe('0%');
  });

  it('handles empty tools array gracefully', () => {
    render(<AgentPanel tools={[]} workflowStyle="Pair builder" humanRatio={50} />);
    expect(screen.queryByTestId('agent-tools')).not.toBeInTheDocument();
    // Should still render workflow and ratio
    expect(screen.getByTestId('workflow-style')).toBeInTheDocument();
    expect(screen.getByTestId('ratio-bar')).toBeInTheDocument();
  });

  it('renders ratio bar with accent-subtle background', () => {
    const { container } = render(
      <AgentPanel tools={mockTools} workflowStyle="Pair builder" humanRatio={40} />,
    );
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain('bg-accent-subtle');
  });
});
