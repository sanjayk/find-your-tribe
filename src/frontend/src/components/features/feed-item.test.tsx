import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedItem } from './feed-item';

describe('FeedItem', () => {
  const mockActor = {
    name: 'Maya Chen',
    initials: 'MC',
    avatarColor: 'bg-indigo-100',
    avatarTextColor: 'text-indigo-700',
  };

  describe('shipped event', () => {
    it('renders without crashing', () => {
      render(
        <FeedItem
          type="shipped"
          actor={mockActor}
          timestamp="2h"
          metadata={{
            project: {
              name: 'AI Resume Builder',
              techStack: ['React', 'FastAPI', 'PostgreSQL'],
              stars: 142,
              gradientColors: {
                from: 'from-indigo-500',
                via: 'via-violet-500',
                to: 'to-purple-600',
              },
            },
          }}
        />
      );
    });

    it('renders name and action text', () => {
      render(
        <FeedItem
          type="shipped"
          actor={mockActor}
          timestamp="2h"
          metadata={{
            project: {
              name: 'AI Resume Builder',
              techStack: ['React', 'FastAPI', 'PostgreSQL'],
              stars: 142,
              gradientColors: {
                from: 'from-indigo-500',
                via: 'via-violet-500',
                to: 'to-purple-600',
              },
            },
          }}
        />
      );

      expect(screen.getByText('Maya Chen')).toBeInTheDocument();
      expect(screen.getByText('shipped')).toBeInTheDocument();
    });

    it('renders timestamp', () => {
      render(
        <FeedItem
          type="shipped"
          actor={mockActor}
          timestamp="2h"
          metadata={{
            project: {
              name: 'AI Resume Builder',
              techStack: ['React', 'FastAPI', 'PostgreSQL'],
              stars: 142,
              gradientColors: {
                from: 'from-indigo-500',
                via: 'via-violet-500',
                to: 'to-purple-600',
              },
            },
          }}
        />
      );

      expect(screen.getByText('2h')).toBeInTheDocument();
    });

    it('renders embedded project card with name', () => {
      render(
        <FeedItem
          type="shipped"
          actor={mockActor}
          timestamp="2h"
          metadata={{
            project: {
              name: 'AI Resume Builder',
              techStack: ['React', 'FastAPI', 'PostgreSQL'],
              stars: 142,
              gradientColors: {
                from: 'from-indigo-500',
                via: 'via-violet-500',
                to: 'to-purple-600',
              },
            },
          }}
        />
      );

      expect(screen.getByText('AI Resume Builder')).toBeInTheDocument();
    });

    it('renders tech stack in embedded project', () => {
      render(
        <FeedItem
          type="shipped"
          actor={mockActor}
          timestamp="2h"
          metadata={{
            project: {
              name: 'AI Resume Builder',
              techStack: ['React', 'FastAPI', 'PostgreSQL'],
              stars: 142,
              gradientColors: {
                from: 'from-indigo-500',
                via: 'via-violet-500',
                to: 'to-purple-600',
              },
            },
          }}
        />
      );

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('FastAPI')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    });

    it('renders stars count in embedded project', () => {
      render(
        <FeedItem
          type="shipped"
          actor={mockActor}
          timestamp="2h"
          metadata={{
            project: {
              name: 'AI Resume Builder',
              techStack: ['React', 'FastAPI', 'PostgreSQL'],
              stars: 142,
              gradientColors: {
                from: 'from-indigo-500',
                via: 'via-violet-500',
                to: 'to-purple-600',
              },
            },
          }}
        />
      );

      expect(screen.getByText('142')).toBeInTheDocument();
    });

    it('renders avatar with correct initials', () => {
      render(
        <FeedItem
          type="shipped"
          actor={mockActor}
          timestamp="2h"
          metadata={{
            project: {
              name: 'AI Resume Builder',
              techStack: ['React', 'FastAPI', 'PostgreSQL'],
              stars: 142,
              gradientColors: {
                from: 'from-indigo-500',
                via: 'via-violet-500',
                to: 'to-purple-600',
              },
            },
          }}
        />
      );

      expect(screen.getByText('MC')).toBeInTheDocument();
    });
  });

  describe('formed-tribe event', () => {
    it('renders without crashing', () => {
      render(
        <FeedItem
          type="formed-tribe"
          actor={{
            name: 'Priya Sharma',
            initials: 'PS',
            avatarColor: 'bg-rose-100',
            avatarTextColor: 'text-rose-700',
          }}
          timestamp="1d"
          metadata={{
            tribe: {
              name: 'Tribe Finder Team',
              description:
                '3 members. Looking for a backend engineer and growth marketer.',
              members: [
                {
                  initials: 'PS',
                  avatarColor: 'bg-rose-100',
                  avatarTextColor: 'text-rose-700',
                },
                {
                  initials: 'MC',
                  avatarColor: 'bg-indigo-100',
                  avatarTextColor: 'text-indigo-700',
                },
                {
                  initials: 'JO',
                  avatarColor: 'bg-amber-100',
                  avatarTextColor: 'text-amber-700',
                },
              ],
            },
          }}
        />
      );
    });

    it('renders name and action text', () => {
      render(
        <FeedItem
          type="formed-tribe"
          actor={{
            name: 'Priya Sharma',
            initials: 'PS',
            avatarColor: 'bg-rose-100',
            avatarTextColor: 'text-rose-700',
          }}
          timestamp="1d"
          metadata={{
            tribe: {
              name: 'Tribe Finder Team',
              description:
                '3 members. Looking for a backend engineer and growth marketer.',
              members: [
                {
                  initials: 'PS',
                  avatarColor: 'bg-rose-100',
                  avatarTextColor: 'text-rose-700',
                },
              ],
            },
          }}
        />
      );

      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByText('formed a tribe')).toBeInTheDocument();
    });

    it('renders timestamp', () => {
      render(
        <FeedItem
          type="formed-tribe"
          actor={{
            name: 'Priya Sharma',
            initials: 'PS',
            avatarColor: 'bg-rose-100',
            avatarTextColor: 'text-rose-700',
          }}
          timestamp="1d"
          metadata={{
            tribe: {
              name: 'Tribe Finder Team',
              description:
                '3 members. Looking for a backend engineer and growth marketer.',
              members: [
                {
                  initials: 'PS',
                  avatarColor: 'bg-rose-100',
                  avatarTextColor: 'text-rose-700',
                },
              ],
            },
          }}
        />
      );

      expect(screen.getByText('1d')).toBeInTheDocument();
    });

    it('renders tribe name and description', () => {
      render(
        <FeedItem
          type="formed-tribe"
          actor={{
            name: 'Priya Sharma',
            initials: 'PS',
            avatarColor: 'bg-rose-100',
            avatarTextColor: 'text-rose-700',
          }}
          timestamp="1d"
          metadata={{
            tribe: {
              name: 'Tribe Finder Team',
              description:
                '3 members. Looking for a backend engineer and growth marketer.',
              members: [
                {
                  initials: 'PS',
                  avatarColor: 'bg-rose-100',
                  avatarTextColor: 'text-rose-700',
                },
              ],
            },
          }}
        />
      );

      expect(screen.getByText('Tribe Finder Team')).toBeInTheDocument();
      expect(
        screen.getByText(
          '3 members. Looking for a backend engineer and growth marketer.',
        ),
      ).toBeInTheDocument();
    });

    it('renders member avatars', () => {
      render(
        <FeedItem
          type="formed-tribe"
          actor={{
            name: 'Priya Sharma',
            initials: 'PS',
            avatarColor: 'bg-rose-100',
            avatarTextColor: 'text-rose-700',
          }}
          timestamp="1d"
          metadata={{
            tribe: {
              name: 'Tribe Finder Team',
              description: '3 members.',
              members: [
                {
                  initials: 'PS',
                  avatarColor: 'bg-rose-100',
                  avatarTextColor: 'text-rose-700',
                },
                {
                  initials: 'MC',
                  avatarColor: 'bg-indigo-100',
                  avatarTextColor: 'text-indigo-700',
                },
                {
                  initials: 'JO',
                  avatarColor: 'bg-amber-100',
                  avatarTextColor: 'text-amber-700',
                },
              ],
            },
          }}
        />
      );

      const avatars = screen.getAllByText(/^[A-Z]{2}$/);
      expect(avatars.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('started-building event', () => {
    it('renders without crashing', () => {
      render(
        <FeedItem
          type="started-building"
          actor={{
            name: 'Alex Rivera',
            initials: 'AR',
            avatarColor: 'bg-cyan-100',
            avatarTextColor: 'text-cyan-700',
          }}
          timestamp="5h"
          metadata={{
            project: {
              name: 'DevOps Dashboard',
              techStack: ['React', 'Node.js', 'Docker'],
              iconGradient: {
                from: 'from-slate-500',
                to: 'to-slate-700',
              },
            },
          }}
        />
      );
    });

    it('renders name and action text', () => {
      render(
        <FeedItem
          type="started-building"
          actor={{
            name: 'Alex Rivera',
            initials: 'AR',
            avatarColor: 'bg-cyan-100',
            avatarTextColor: 'text-cyan-700',
          }}
          timestamp="5h"
          metadata={{
            project: {
              name: 'DevOps Dashboard',
              techStack: ['React', 'Node.js', 'Docker'],
              iconGradient: {
                from: 'from-slate-500',
                to: 'to-slate-700',
              },
            },
          }}
        />
      );

      expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
      expect(screen.getByText('started building')).toBeInTheDocument();
    });

    it('renders timestamp', () => {
      render(
        <FeedItem
          type="started-building"
          actor={{
            name: 'Alex Rivera',
            initials: 'AR',
            avatarColor: 'bg-cyan-100',
            avatarTextColor: 'text-cyan-700',
          }}
          timestamp="5h"
          metadata={{
            project: {
              name: 'DevOps Dashboard',
              techStack: ['React', 'Node.js', 'Docker'],
              iconGradient: {
                from: 'from-slate-500',
                to: 'to-slate-700',
              },
            },
          }}
        />
      );

      expect(screen.getByText('5h')).toBeInTheDocument();
    });

    it('renders project name', () => {
      render(
        <FeedItem
          type="started-building"
          actor={{
            name: 'Alex Rivera',
            initials: 'AR',
            avatarColor: 'bg-cyan-100',
            avatarTextColor: 'text-cyan-700',
          }}
          timestamp="5h"
          metadata={{
            project: {
              name: 'DevOps Dashboard',
              techStack: ['React', 'Node.js', 'Docker'],
              iconGradient: {
                from: 'from-slate-500',
                to: 'to-slate-700',
              },
            },
          }}
        />
      );

      expect(screen.getByText('DevOps Dashboard')).toBeInTheDocument();
    });

    it('renders tech stack with separators', () => {
      render(
        <FeedItem
          type="started-building"
          actor={{
            name: 'Alex Rivera',
            initials: 'AR',
            avatarColor: 'bg-cyan-100',
            avatarTextColor: 'text-cyan-700',
          }}
          timestamp="5h"
          metadata={{
            project: {
              name: 'DevOps Dashboard',
              techStack: ['React', 'Node.js', 'Docker'],
              iconGradient: {
                from: 'from-slate-500',
                to: 'to-slate-700',
              },
            },
          }}
        />
      );

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
      expect(screen.getByText('Docker')).toBeInTheDocument();
    });
  });

  describe('joined event', () => {
    it('renders without crashing', () => {
      render(
        <FeedItem
          type="joined"
          actor={{
            name: 'James Okafor',
            initials: 'JO',
            avatarColor: 'bg-amber-100',
            avatarTextColor: 'text-amber-700',
          }}
          timestamp="2d"
          metadata={{
            skills: ['Figma', 'UI/UX', 'Prototyping'],
          }}
        />
      );
    });

    it('renders name and action text', () => {
      render(
        <FeedItem
          type="joined"
          actor={{
            name: 'James Okafor',
            initials: 'JO',
            avatarColor: 'bg-amber-100',
            avatarTextColor: 'text-amber-700',
          }}
          timestamp="2d"
          metadata={{
            skills: ['Figma', 'UI/UX', 'Prototyping'],
          }}
        />
      );

      expect(screen.getByText('James Okafor')).toBeInTheDocument();
      expect(screen.getByText('joined Find Your Tribe')).toBeInTheDocument();
    });

    it('renders timestamp', () => {
      render(
        <FeedItem
          type="joined"
          actor={{
            name: 'James Okafor',
            initials: 'JO',
            avatarColor: 'bg-amber-100',
            avatarTextColor: 'text-amber-700',
          }}
          timestamp="2d"
          metadata={{
            skills: ['Figma', 'UI/UX', 'Prototyping'],
          }}
        />
      );

      expect(screen.getByText('2d')).toBeInTheDocument();
    });

    it('renders skills with separators', () => {
      render(
        <FeedItem
          type="joined"
          actor={{
            name: 'James Okafor',
            initials: 'JO',
            avatarColor: 'bg-amber-100',
            avatarTextColor: 'text-amber-700',
          }}
          timestamp="2d"
          metadata={{
            skills: ['Figma', 'UI/UX', 'Prototyping'],
          }}
        />
      );

      expect(screen.getByText('Figma')).toBeInTheDocument();
      expect(screen.getByText('UI/UX')).toBeInTheDocument();
      expect(screen.getByText('Prototyping')).toBeInTheDocument();
    });
  });
});
