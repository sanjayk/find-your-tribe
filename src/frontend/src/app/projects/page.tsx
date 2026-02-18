'use client';

import { useQuery } from '@apollo/client/react';

import { GET_PROJECTS } from '@/lib/graphql/queries/projects';
import type { GetProjectsData, Project, ProjectStatus } from '@/lib/graphql/types';
import { ProjectCard } from '@/components/features/project-card';

const PAGE_SIZE = 12;

/* ─── Helpers ─── */

function mapStatus(status: ProjectStatus): 'shipped' | 'in-progress' {
  return status === 'SHIPPED' ? 'shipped' : 'in-progress';
}

/* ─── Loading Skeleton ─── */

function ProjectsSkeleton() {
  return (
    <div
      data-testid="projects-skeleton"
      className="mx-auto max-w-[1120px] px-6 py-16 animate-pulse"
    >
      <div className="h-10 w-56 bg-surface-secondary rounded mb-3" />
      <div className="h-5 w-80 bg-surface-secondary rounded mb-12" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div key={i} className="h-48 bg-surface-secondary rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ─── Project Grid ─── */

function ProjectGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          title={project.title}
          description={project.description ?? ''}
          status={mapStatus(project.status)}
          role={project.role ?? undefined}
          techStack={project.techStack}
        />
      ))}
    </div>
  );
}

/* ─── Page ─── */

export default function ProjectsPage() {
  const { data, loading, error, fetchMore } = useQuery<GetProjectsData>(
    GET_PROJECTS,
    { variables: { limit: PAGE_SIZE, offset: 0 } },
  );

  if (loading) return <ProjectsSkeleton />;
  if (error) {
    return (
      <div className="mx-auto max-w-[1120px] px-6 py-24 text-center">
        <h1 className="font-serif text-4xl text-ink mb-3">Something went wrong</h1>
        <p className="text-ink-secondary">Could not load projects. Try refreshing.</p>
      </div>
    );
  }

  const projects = data?.projects ?? [];

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-[1120px] px-6 py-16">
        <h1 className="font-serif text-[40px] leading-tight text-ink mb-3">
          Projects
        </h1>
        <p className="text-[15px] text-ink-secondary mb-12">
          Explore what builders in your tribe are shipping.
        </p>
        <p className="text-ink-secondary text-center py-16">No projects yet. Be the first to ship.</p>
      </div>
    );
  }

  const handleLoadMore = () => {
    fetchMore({
      variables: { offset: projects.length },
      updateQuery: (prev: GetProjectsData, { fetchMoreResult }: { fetchMoreResult?: GetProjectsData }) => {
        if (!fetchMoreResult) return prev;
        return {
          projects: [...prev.projects, ...fetchMoreResult.projects],
        };
      },
    });
  };

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-16">
      <h1 className="font-serif text-[40px] leading-tight text-ink mb-3">
        Projects
      </h1>
      <p className="text-[15px] text-ink-secondary mb-12">
        Explore what builders in your tribe are shipping.
      </p>

      <ProjectGrid projects={projects} />

      {projects.length >= PAGE_SIZE && (
        <div className="mt-12 text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-3 text-[14px] font-medium text-ink-secondary bg-surface-secondary hover:bg-surface-secondary/80 rounded-lg transition-colors"
          >
            Load more projects
          </button>
        </div>
      )}
    </div>
  );
}
