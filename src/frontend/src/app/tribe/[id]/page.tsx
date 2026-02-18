import type { Metadata } from 'next';
import { serverQuery } from '@/lib/graphql/server-fetch';
import TribePageContent from './tribe-content';

type TribeMetaData = {
  tribe: {
    name: string;
    mission: string | null;
    status: string;
    maxMembers: number;
    members: { status: string }[];
  } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const data = await serverQuery<TribeMetaData>(
    `query GetTribeMeta($id: ID!) {
      tribe(id: $id) {
        name
        mission
        status
        maxMembers
        members {
          status
        }
      }
    }`,
    { id }
  );

  if (!data?.tribe) {
    return { title: 'Tribe' };
  }

  const { name, mission, members, maxMembers } = data.tribe;
  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  const pageTitle = `${name} — ${activeCount}/${maxMembers} members`;
  const pageDescription = mission || `A builder tribe on Find Your Tribe.`;

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
    },
  };
}

export default async function TribePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const data = await serverQuery<TribeMetaData>(
    `query GetTribeMeta($id: ID!) {
      tribe(id: $id) {
        name
        mission
        status
        maxMembers
        members {
          status
        }
      }
    }`,
    { id }
  );

  const jsonLd = data?.tribe
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: data.tribe.name,
        ...(data.tribe.mission && { description: data.tribe.mission }),
        numberOfEmployees: {
          '@type': 'QuantitativeValue',
          value: data.tribe.members.filter((m) => m.status === 'ACTIVE').length,
        },
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
      <TribePageContent />
    </>
  );
}
