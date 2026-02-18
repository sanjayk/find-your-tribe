import type { Metadata } from 'next';
import { serverQuery } from '@/lib/graphql/server-fetch';
import ProfilePageContent from './profile-content';

const ROLE_LABELS: Record<string, string> = {
  ENGINEER: 'Engineer',
  DESIGNER: 'Designer',
  PM: 'Product Manager',
  MARKETER: 'Marketer',
  GROWTH: 'Growth',
  FOUNDER: 'Founder',
  OTHER: 'Builder',
};

type ProfileMetaData = {
  user: {
    displayName: string;
    headline: string | null;
    bio: string | null;
    primaryRole: string | null;
  } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  const data = await serverQuery<ProfileMetaData>(
    `query GetBuilderMeta($username: String!) {
      user(username: $username) {
        displayName
        headline
        bio
        primaryRole
      }
    }`,
    { username }
  );

  if (!data?.user) {
    return { title: `@${username}` };
  }

  const { displayName, headline, bio, primaryRole } = data.user;
  const roleLabel = primaryRole ? ROLE_LABELS[primaryRole] || primaryRole : null;
  const titleParts = [displayName, roleLabel].filter(Boolean).join(' — ');
  const description = headline || bio || `Builder profile for ${displayName} on Find Your Tribe.`;

  return {
    title: titleParts,
    description,
    openGraph: {
      title: `${displayName} on Find Your Tribe`,
      description,
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const data = await serverQuery<ProfileMetaData>(
    `query GetBuilderMeta($username: String!) {
      user(username: $username) {
        displayName
        headline
        bio
        primaryRole
      }
    }`,
    { username }
  );

  const jsonLd = data?.user
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: data.user.displayName,
          ...(data.user.primaryRole && {
            jobTitle: ROLE_LABELS[data.user.primaryRole] || data.user.primaryRole,
          }),
          ...(data.user.bio && { description: data.user.bio }),
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
      <ProfilePageContent />
    </>
  );
}
