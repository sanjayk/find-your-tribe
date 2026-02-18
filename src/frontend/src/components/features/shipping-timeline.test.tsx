import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ShippingTimeline } from './shipping-timeline';

import type { Project } from '@/lib/graphql/types';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    title: 'Test Project',
    description: 'A test project',
    status: 'SHIPPED',
    role: 'creator',
    techStack: ['React'],
    links: {},
    impactMetrics: {},
    githubRepoFullName: null,
    githubStars: null,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-12-01T00:00:00Z',
    ...overrides,
  };
}

describe('ShippingTimeline', () => {
  it('renders without crashing', () => {
    const projects = [makeProject()];
    render(<ShippingTimeline projects={projects} />);
  });

  it('renders the "Shipping Timeline" label', () => {
    const projects = [makeProject()];
    render(<ShippingTimeline projects={projects} />);
    expect(screen.getByText('Shipping Timeline')).toBeInTheDocument();
  });

  it('returns null when projects array is empty', () => {
    const { container } = render(<ShippingTimeline projects={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders project title in hover tooltip', () => {
    const projects = [makeProject({ title: 'Tribe Finder' })];
    render(<ShippingTimeline projects={projects} />);
    expect(screen.getByText('Tribe Finder')).toBeInTheDocument();
  });

  it('renders date labels for earliest and latest projects', () => {
    const projects = [
      makeProject({ id: 'p1', createdAt: '2025-03-01T00:00:00Z' }),
      makeProject({ id: 'p2', createdAt: '2025-09-01T00:00:00Z' }),
    ];
    render(<ShippingTimeline projects={projects} />);
    expect(screen.getByText('Mar 2025')).toBeInTheDocument();
    expect(screen.getByText('Sep 2025')).toBeInTheDocument();
  });

  it('renders a dot for each project', () => {
    const projects = [
      makeProject({ id: 'p1', title: 'Project A', createdAt: '2025-01-01T00:00:00Z' }),
      makeProject({ id: 'p2', title: 'Project B', createdAt: '2025-06-01T00:00:00Z' }),
      makeProject({ id: 'p3', title: 'Project C', createdAt: '2025-12-01T00:00:00Z' }),
    ];
    render(<ShippingTimeline projects={projects} />);
    expect(screen.getByText('Project A')).toBeInTheDocument();
    expect(screen.getByText('Project B')).toBeInTheDocument();
    expect(screen.getByText('Project C')).toBeInTheDocument();
  });

  it('uses filled dot (bg-accent) for shipped projects', () => {
    const projects = [makeProject({ status: 'SHIPPED' })];
    const { container } = render(<ShippingTimeline projects={projects} />);
    const dot = container.querySelector('.bg-accent');
    expect(dot).not.toBeNull();
  });

  it('uses ring dot for in-progress projects', () => {
    const projects = [makeProject({ status: 'IN_PROGRESS' })];
    const { container } = render(<ShippingTimeline projects={projects} />);
    const dot = container.querySelector('.ring-in-progress');
    expect(dot).not.toBeNull();
  });

  it('sorts projects chronologically', () => {
    const projects = [
      makeProject({ id: 'p2', title: 'Later', createdAt: '2025-12-01T00:00:00Z' }),
      makeProject({ id: 'p1', title: 'Earlier', createdAt: '2025-01-01T00:00:00Z' }),
    ];
    render(<ShippingTimeline projects={projects} />);
    // Earliest date label should be Jan 2025
    expect(screen.getByText('Jan 2025')).toBeInTheDocument();
    // Latest date label should be Dec 2025
    expect(screen.getByText('Dec 2025')).toBeInTheDocument();
  });

  it('handles a single project (range of zero)', () => {
    const projects = [makeProject({ title: 'Solo Project' })];
    render(<ShippingTimeline projects={projects} />);
    expect(screen.getByText('Solo Project')).toBeInTheDocument();
    // The same date should appear for both labels
    const dateLabels = screen.getAllByText('Jun 2025');
    expect(dateLabels).toHaveLength(2);
  });

  it('renders the timeline axis line', () => {
    const projects = [makeProject()];
    const { container } = render(<ShippingTimeline projects={projects} />);
    // The axis is a div with h-px class
    const axis = container.querySelector('.h-px');
    expect(axis).not.toBeNull();
  });
});
