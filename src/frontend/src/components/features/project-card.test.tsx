import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectCard } from './project-card';

describe('ProjectCard', () => {
  it('renders title and description', () => {
    render(
      <ProjectCard
        title="ShipLog"
        description="Changelog-as-a-service for developer tools."
        status="in-progress"
      />
    );

    expect(screen.getByText('ShipLog')).toBeInTheDocument();
    expect(screen.getByText('Changelog-as-a-service for developer tools.')).toBeInTheDocument();
  });

  it('renders Building status for in-progress', () => {
    render(
      <ProjectCard
        title="ShipLog"
        description="Changelog-as-a-service"
        status="in-progress"
      />
    );

    expect(screen.getByText('Building')).toBeInTheDocument();
  });

  it('renders Shipped status for shipped', () => {
    render(
      <ProjectCard
        title="DevSync"
        description="Real-time code collaboration"
        status="shipped"
      />
    );

    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('renders minimal card without footer when no metadata', () => {
    const { container } = render(
      <ProjectCard
        title="NeuralSearch"
        description="Semantic search for docs."
        status="in-progress"
      />
    );

    // No footer zone should render
    const footer = container.querySelector('.bg-surface-secondary');
    expect(footer).not.toBeInTheDocument();
  });

  it('renders agent tools as pills in footer', () => {
    render(
      <ProjectCard
        title="ShipLog"
        description="Changelog-as-a-service"
        status="in-progress"
        agentTools={['Claude Code', 'Cursor']}
      />
    );

    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });

  it('renders workflow style text', () => {
    render(
      <ProjectCard
        title="ShipLog"
        description="Changelog-as-a-service"
        status="in-progress"
        agentTools={['Claude Code']}
        workflowStyle="Pair programming"
      />
    );

    expect(screen.getByText('Pair programming')).toBeInTheDocument();
  });

  it('renders tech stack as quiet text in footer', () => {
    render(
      <ProjectCard
        title="ShipLog"
        description="Changelog-as-a-service"
        status="in-progress"
        techStack={['Next.js', 'Python', 'PostgreSQL']}
      />
    );

    expect(screen.getByText('Next.js · Python · PostgreSQL')).toBeInTheDocument();
  });

  it('renders role right-aligned in footer', () => {
    render(
      <ProjectCard
        title="ShipLog"
        description="Changelog-as-a-service"
        status="in-progress"
        role="Lead"
      />
    );

    expect(screen.getByText('Lead')).toBeInTheDocument();
  });

  it('renders full card with all metadata', () => {
    render(
      <ProjectCard
        title="ShipLog"
        description="Changelog-as-a-service for developer tools."
        status="in-progress"
        role="Lead"
        agentTools={['Claude Code', 'Cursor']}
        workflowStyle="Pair programming"
        techStack={['Next.js', 'Python', 'PostgreSQL']}
      />
    );

    expect(screen.getByText('ShipLog')).toBeInTheDocument();
    expect(screen.getByText('Building')).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('Pair programming')).toBeInTheDocument();
    expect(screen.getByText('Lead')).toBeInTheDocument();
    expect(screen.getByText('Next.js · Python · PostgreSQL')).toBeInTheDocument();
  });
});
