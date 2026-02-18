import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { AgentPanel } from './agent-panel';

const defaultProps = {
  editors: ['Cursor'],
  agents: ['Claude Code', 'Cline'],
  models: ['Claude Sonnet'],
  workflowStyles: ['Pair builder'],
  humanRatio: 30,
};

describe('AgentPanel', () => {
  it('renders without crashing', () => {
    render(<AgentPanel {...defaultProps} />);
  });

  it('renders the "HOW I BUILD" label', () => {
    render(<AgentPanel {...defaultProps} />);
    expect(screen.getByText(/how i build/i)).toBeInTheDocument();
  });

  it('renders category labels for non-empty categories', () => {
    render(<AgentPanel {...defaultProps} />);
    expect(screen.getByText('Editors')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Models')).toBeInTheDocument();
    expect(screen.getByText('Workflow')).toBeInTheDocument();
  });

  it('skips category labels for empty categories', () => {
    render(<AgentPanel editors={[]} agents={['Aider']} models={[]} workflowStyles={['Minimal AI']} humanRatio={80} />);
    expect(screen.queryByText('Editors')).not.toBeInTheDocument();
    expect(screen.queryByText('Models')).not.toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Workflow')).toBeInTheDocument();
  });

  it('renders editor names as pills', () => {
    render(<AgentPanel {...defaultProps} />);
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByTestId('editor-pill')).toBeInTheDocument();
  });

  it('renders all agent names as pills', () => {
    render(<AgentPanel {...defaultProps} />);
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cline')).toBeInTheDocument();
    expect(screen.getAllByTestId('agent-pill')).toHaveLength(2);
  });

  it('renders model names as pills', () => {
    render(<AgentPanel {...defaultProps} />);
    expect(screen.getByText('Claude Sonnet')).toBeInTheDocument();
    expect(screen.getByTestId('model-pill')).toBeInTheDocument();
  });

  it('caps visible pills at 3 and shows overflow button', () => {
    render(<AgentPanel {...defaultProps} models={['Claude Opus', 'Claude Sonnet', 'DeepSeek', 'Llama 3', 'GPT-4o']} />);
    expect(screen.getAllByTestId('model-pill')).toHaveLength(3);
    expect(screen.getByTestId('model-overflow')).toHaveTextContent('+2 more');
  });

  it('shows overflow popover on click', async () => {
    const user = userEvent.setup();
    render(<AgentPanel {...defaultProps} models={['Claude Opus', 'Claude Sonnet', 'DeepSeek', 'Llama 3']} />);

    await user.click(screen.getByTestId('model-overflow'));
    expect(screen.getByText('Llama 3')).toBeInTheDocument();
  });

  it('does not show overflow button when items are 3 or fewer', () => {
    render(<AgentPanel {...defaultProps} models={['Claude Opus', 'Claude Sonnet', 'DeepSeek']} />);
    expect(screen.getAllByTestId('model-pill')).toHaveLength(3);
    expect(screen.queryByTestId('model-overflow')).not.toBeInTheDocument();
  });

  it('renders workflow styles', () => {
    render(<AgentPanel {...defaultProps} />);
    expect(screen.getByTestId('workflow-style')).toHaveTextContent('Pair builder');
  });

  it('renders workflow styles joined with " / "', () => {
    render(<AgentPanel {...defaultProps} workflowStyles={['Pair builder', 'Swarm delegation']} />);
    expect(screen.getByTestId('workflow-style')).toHaveTextContent('Pair builder / Swarm delegation');
  });

  it('renders ratio bar with correct proportions', () => {
    render(<AgentPanel {...defaultProps} />);
    const humanBar = screen.getByTestId('ratio-human');
    const aiBar = screen.getByTestId('ratio-ai');
    expect(humanBar.style.width).toBe('30%');
    expect(aiBar.style.width).toBe('70%');
  });

  it('renders ratio label', () => {
    render(<AgentPanel {...defaultProps} />);
    const label = screen.getByTestId('ratio-label');
    expect(label.textContent).toBe('30/70');
  });

  it('clamps humanRatio below 0 to 0', () => {
    render(<AgentPanel {...defaultProps} humanRatio={-10} />);
    expect(screen.getByTestId('ratio-human').style.width).toBe('0%');
  });

  it('clamps humanRatio above 100 to 100', () => {
    render(<AgentPanel {...defaultProps} humanRatio={120} />);
    expect(screen.getByTestId('ratio-human').style.width).toBe('100%');
    expect(screen.getByTestId('ratio-ai').style.width).toBe('0%');
  });

  it('handles empty tools gracefully', () => {
    render(<AgentPanel editors={[]} agents={[]} models={[]} workflowStyles={['Pair builder']} humanRatio={50} />);
    expect(screen.queryByText('Editors')).not.toBeInTheDocument();
    expect(screen.queryByText('Agents')).not.toBeInTheDocument();
    expect(screen.queryByText('Models')).not.toBeInTheDocument();
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByTestId('ratio-bar')).toBeInTheDocument();
  });

  it('renders setup note when provided', () => {
    render(<AgentPanel {...defaultProps} setupNote="I pair program with Claude all day" />);
    expect(screen.getByTestId('setup-note')).toHaveTextContent('I pair program with Claude all day');
  });

  it('hides setup note when not provided', () => {
    render(<AgentPanel {...defaultProps} />);
    expect(screen.queryByTestId('setup-note')).not.toBeInTheDocument();
  });

  it('hides setup note when empty string', () => {
    render(<AgentPanel {...defaultProps} setupNote="" />);
    expect(screen.queryByTestId('setup-note')).not.toBeInTheDocument();
  });

  it('renders without workflow style but with ratio', () => {
    render(<AgentPanel {...defaultProps} workflowStyles={[]} />);
    expect(screen.getByTestId('ratio-bar')).toBeInTheDocument();
    expect(screen.getByTestId('ratio-label')).toBeInTheDocument();
  });
});
