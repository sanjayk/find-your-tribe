import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectCard } from './project-card';

describe('ProjectCard', () => {
  const mockCollaborators = [
    { name: 'Maya Chen', initials: 'MC', avatarColor: 'bg-indigo-100 text-indigo-700' },
    { name: 'James Okafor', initials: 'JO', avatarColor: 'bg-amber-100 text-amber-700' },
  ];

  const mockTechStack = ['React', 'FastAPI', 'PostgreSQL', 'GPT-4'];

  const mockGradientColors = {
    from: 'from-indigo-500',
    via: 'via-violet-500',
    to: 'to-purple-600',
  };

  describe('hero variant', () => {
    it('renders without crashing', () => {
      render(
        <ProjectCard
          variant="hero"
          title="AI Resume Builder"
          description="AI-powered resume builder that helps developers showcase their skills with beautiful, ATS-friendly templates."
          techStack={mockTechStack}
          collaborators={mockCollaborators}
          status="shipped"
          gradientColors={mockGradientColors}
        />
      );
    });

    it('renders title and description', () => {
      render(
        <ProjectCard
          variant="hero"
          title="AI Resume Builder"
          description="AI-powered resume builder that helps developers showcase their skills with beautiful, ATS-friendly templates."
          techStack={mockTechStack}
          collaborators={mockCollaborators}
          status="shipped"
          gradientColors={mockGradientColors}
        />
      );

      expect(screen.getByText('AI Resume Builder')).toBeInTheDocument();
      expect(screen.getByText(/AI-powered resume builder/)).toBeInTheDocument();
    });

    it('renders gradient thumbnail with aspect-[16/9]', () => {
      const { container } = render(
        <ProjectCard
          variant="hero"
          title="AI Resume Builder"
          description="AI-powered resume builder"
          techStack={mockTechStack}
          collaborators={mockCollaborators}
          status="shipped"
          gradientColors={mockGradientColors}
        />
      );

      const thumbnail = container.querySelector('.aspect-\\[16\\/9\\]');
      expect(thumbnail).toBeInTheDocument();
    });

    it('renders tech stack as badge pills', () => {
      render(
        <ProjectCard
          variant="hero"
          title="AI Resume Builder"
          description="AI-powered resume builder"
          techStack={mockTechStack}
          collaborators={mockCollaborators}
          status="shipped"
          gradientColors={mockGradientColors}
        />
      );

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('FastAPI')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
    });

    it('renders collaborators with avatars', () => {
      render(
        <ProjectCard
          variant="hero"
          title="AI Resume Builder"
          description="AI-powered resume builder"
          techStack={mockTechStack}
          collaborators={mockCollaborators}
          status="shipped"
          gradientColors={mockGradientColors}
        />
      );

      expect(screen.getByText('MC')).toBeInTheDocument();
      expect(screen.getByText('Maya Chen')).toBeInTheDocument();
      expect(screen.getByText('JO')).toBeInTheDocument();
      expect(screen.getByText('James Okafor')).toBeInTheDocument();
    });

    it('renders stars count when provided', () => {
      render(
        <ProjectCard
          variant="hero"
          title="AI Resume Builder"
          description="AI-powered resume builder"
          techStack={mockTechStack}
          collaborators={mockCollaborators}
          status="shipped"
          gradientColors={mockGradientColors}
          stars={142}
        />
      );

      expect(screen.getByText('142')).toBeInTheDocument();
    });

    it('renders shipped date badge when provided', () => {
      render(
        <ProjectCard
          variant="hero"
          title="AI Resume Builder"
          description="AI-powered resume builder"
          techStack={mockTechStack}
          collaborators={mockCollaborators}
          status="shipped"
          gradientColors={mockGradientColors}
          shippedDate="2 weeks ago"
        />
      );

      expect(screen.getByText('Shipped 2 weeks ago')).toBeInTheDocument();
    });
  });

  describe('compact variant', () => {
    it('renders without crashing', () => {
      render(
        <ProjectCard
          variant="compact"
          title="Tribe Finder"
          description="AI-powered matching to connect builders with complementary skills."
          techStack={['Next.js', 'Go', 'Redis']}
          collaborators={[mockCollaborators[0]]}
          status="in-progress"
          gradientColors={{
            from: 'from-emerald-400',
            via: 'via-teal-500',
            to: 'to-cyan-600',
          }}
        />
      );
    });

    it('renders title', () => {
      render(
        <ProjectCard
          variant="compact"
          title="Tribe Finder"
          description="AI-powered matching to connect builders with complementary skills."
          techStack={['Next.js', 'Go', 'Redis']}
          collaborators={[mockCollaborators[0]]}
          status="in-progress"
          gradientColors={{
            from: 'from-emerald-400',
            via: 'via-teal-500',
            to: 'to-cyan-600',
          }}
        />
      );

      expect(screen.getByText('Tribe Finder')).toBeInTheDocument();
    });

    it('renders gradient thumbnail with aspect-[16/7]', () => {
      const { container } = render(
        <ProjectCard
          variant="compact"
          title="Tribe Finder"
          description="AI-powered matching"
          techStack={['Next.js', 'Go', 'Redis']}
          collaborators={[mockCollaborators[0]]}
          status="in-progress"
          gradientColors={{
            from: 'from-emerald-400',
            via: 'via-teal-500',
            to: 'to-cyan-600',
          }}
        />
      );

      const thumbnail = container.querySelector('.aspect-\\[16\\/7\\]');
      expect(thumbnail).toBeInTheDocument();
    });

    it('renders tech stack as inline text with "/" separators', () => {
      render(
        <ProjectCard
          variant="compact"
          title="Tribe Finder"
          description="AI-powered matching"
          techStack={['Next.js', 'Go', 'Redis']}
          collaborators={[mockCollaborators[0]]}
          status="in-progress"
          gradientColors={{
            from: 'from-emerald-400',
            via: 'via-teal-500',
            to: 'to-cyan-600',
          }}
        />
      );

      expect(screen.getByText('Next.js')).toBeInTheDocument();
      expect(screen.getByText('Go')).toBeInTheDocument();
      expect(screen.getByText('Redis')).toBeInTheDocument();
      // Check for separators
      const separators = screen.getAllByText('/');
      expect(separators.length).toBeGreaterThan(0);
    });

    it('renders in-progress status badge', () => {
      render(
        <ProjectCard
          variant="compact"
          title="Tribe Finder"
          description="AI-powered matching"
          techStack={['Next.js', 'Go', 'Redis']}
          collaborators={[mockCollaborators[0]]}
          status="in-progress"
          gradientColors={{
            from: 'from-emerald-400',
            via: 'via-teal-500',
            to: 'to-cyan-600',
          }}
        />
      );

      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('renders collaborator with smaller avatar', () => {
      render(
        <ProjectCard
          variant="compact"
          title="Tribe Finder"
          description="AI-powered matching"
          techStack={['Next.js', 'Go', 'Redis']}
          collaborators={[mockCollaborators[0]]}
          status="in-progress"
          gradientColors={{
            from: 'from-emerald-400',
            via: 'via-teal-500',
            to: 'to-cyan-600',
          }}
        />
      );

      expect(screen.getByText('MC')).toBeInTheDocument();
      expect(screen.getByText('Maya Chen')).toBeInTheDocument();
    });
  });
});
