import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TribeCard } from './tribe-card';

describe('TribeCard', () => {
  const mockMembers = [
    { name: 'Priya Sharma', initials: 'PS', avatarColor: 'bg-rose-100', avatarTextColor: 'text-rose-700' },
    { name: 'Maya Chen', initials: 'MC', avatarColor: 'bg-indigo-100', avatarTextColor: 'text-indigo-700' },
    { name: 'James Okafor', initials: 'JO', avatarColor: 'bg-amber-100', avatarTextColor: 'text-amber-700' },
  ];

  const mockTechStack = ['Next.js', 'Go', 'Redis'];

  it('renders tribe name in serif font', () => {
    render(
      <TribeCard
        name="Tribe Finder Team"
        description="Building AI-powered matching for builders."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    const nameElement = screen.getByText('Tribe Finder Team');
    expect(nameElement).toBeInTheDocument();
    expect(nameElement).toHaveClass('font-serif');
  });

  it('renders tribe description', () => {
    render(
      <TribeCard
        name="Tribe Finder Team"
        description="Building AI-powered matching for builders."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    expect(screen.getByText(/Building AI-powered matching for builders/i)).toBeInTheDocument();
  });

  it('renders member avatars with initials', () => {
    render(
      <TribeCard
        name="Tribe Finder Team"
        description="Building AI-powered matching for builders."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    expect(screen.getByText('PS')).toBeInTheDocument();
    expect(screen.getByText('MC')).toBeInTheDocument();
    expect(screen.getByText('JO')).toBeInTheDocument();
  });

  it('renders member avatars with correct colors', () => {
    render(
      <TribeCard
        name="Tribe Finder Team"
        description="Building AI-powered matching for builders."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    const psAvatar = screen.getByText('PS').closest('.avatar');
    expect(psAvatar).toHaveClass('bg-rose-100', 'text-rose-700');

    const mcAvatar = screen.getByText('MC').closest('.avatar');
    expect(mcAvatar).toHaveClass('bg-indigo-100', 'text-indigo-700');
  });

  it('renders member avatars with overlapping layout', () => {
    const { container } = render(
      <TribeCard
        name="Tribe Finder Team"
        description="Building AI-powered matching for builders."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    // Find the container with avatars
    const avatarContainer = container.querySelector('.flex.-space-x-2');
    expect(avatarContainer).toBeInTheDocument();
  });

  it('renders member avatars with ring borders', () => {
    render(
      <TribeCard
        name="Tribe Finder Team"
        description="Building AI-powered matching for builders."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    const psAvatar = screen.getByText('PS').closest('.avatar');
    expect(psAvatar).toHaveClass('ring-2');
  });

  it('renders tech stack badges', () => {
    render(
      <TribeCard
        name="Tribe Finder Team"
        description="Building AI-powered matching for builders."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    expect(screen.getByText('Next.js')).toBeInTheDocument();
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByText('Redis')).toBeInTheDocument();
  });

  it('renders tech stack badges in monospace font', () => {
    render(
      <TribeCard
        name="Tribe Finder Team"
        description="Building AI-powered matching for builders."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    const nextjsBadge = screen.getByText('Next.js');
    expect(nextjsBadge).toHaveClass('font-mono');
  });

  it('renders description with member count', () => {
    render(
      <TribeCard
        name="Tribe Finder Team"
        description="Looking for a backend engineer and growth marketer."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    expect(screen.getByText(/3 members\. Looking for a backend engineer/i)).toBeInTheDocument();
  });

  it('renders description text provided', () => {
    render(
      <TribeCard
        name="Tribe Finder Team"
        description="Building AI-powered tools."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    expect(screen.getByText(/Building AI-powered tools/i)).toBeInTheDocument();
  });

  it('handles single member', () => {
    render(
      <TribeCard
        name="Solo Tribe"
        description="One person tribe."
        members={[mockMembers[0]]}
        techStack={['React']}
        openRolesCount={3}
      />
    );

    expect(screen.getByText('PS')).toBeInTheDocument();
    expect(screen.queryByText('MC')).not.toBeInTheDocument();
  });

  it('handles empty tech stack', () => {
    render(
      <TribeCard
        name="New Tribe"
        description="Just starting out."
        members={mockMembers}
        techStack={[]}
        openRolesCount={1}
      />
    );

    expect(screen.getByText('New Tribe')).toBeInTheDocument();
  });

  it('handles zero open roles', () => {
    render(
      <TribeCard
        name="Full Tribe"
        description="Team is complete."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={0}
      />
    );

    expect(screen.getByText('Full Tribe')).toBeInTheDocument();
  });

  it('renders member count text correctly for singular', () => {
    render(
      <TribeCard
        name="Small Tribe"
        description="Small team."
        members={[mockMembers[0]]}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    expect(screen.getByText(/1.*member/i)).toBeInTheDocument();
  });

  it('renders member count text correctly for plural', () => {
    render(
      <TribeCard
        name="Tribe Finder Team"
        description="Building AI-powered matching for builders."
        members={mockMembers}
        techStack={mockTechStack}
        openRolesCount={2}
      />
    );

    expect(screen.getByText(/3.*members/i)).toBeInTheDocument();
  });
});
