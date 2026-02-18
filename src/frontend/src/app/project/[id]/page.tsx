import type { Metadata } from 'next';
import { serverQuery } from '@/lib/graphql/server-fetch';
import ProjectPageContent from './project-content';

type ProjectMetaData = {
  project: {
    title: string;
    description: string | null;
    status: string;
    techStack: string[];
    owner: {
      displayName: string;
    } | null;
  } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const data = await serverQuery<ProjectMetaData>(
    `query GetProjectMeta($id: ID!) {
      project(id: $id) {
        title
        description
        status
        techStack
        owner {
          displayName
        }
      }
    }`,
    { id }
  );

  if (!data?.project) {
    return { title: 'Project' };
  }

  const { title, description, owner, techStack } = data.project;
  const ownerName = owner?.displayName;
  const pageTitle = ownerName ? `${title} — Shipped by ${ownerName}` : title;
  const pageDescription = description || `A project on Find Your Tribe.`;

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: techStack.length > 0 ? techStack : undefined,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await serverQuery<ProjectMetaData>(
    `query GetProjectMeta($id: ID!) {
      project(id: $id) {
        title
        description
        status
        techStack
        owner {
          displayName
        }
      }
    }`,
    { id }
  );

  const jsonLd = data?.project
    ? {
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: data.project.title,
        ...(data.project.description && {
          description: data.project.description,
        }),
        ...(data.project.owner && {
          author: {
            '@type': 'Person',
            name: data.project.owner.displayName,
          },
        }),
        ...(data.project.techStack.length > 0 && {
          programmingLanguage: data.project.techStack,
        }),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProjectPageContent />
    </>
  );
}
