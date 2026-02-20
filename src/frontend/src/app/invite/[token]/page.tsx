import type { Metadata } from 'next';
import { serverQuery } from '@/lib/graphql/server-fetch';
import InviteContent from './invite-content';

type InviteTokenMetaData = {
  inviteTokenInfo: {
    projectTitle: string;
    inviterName: string;
  } | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  const data = await serverQuery<InviteTokenMetaData>(
    `query InviteTokenMeta($token: String!) {
      inviteTokenInfo(token: $token) {
        projectTitle
        inviterName
      }
    }`,
    { token },
  );

  if (!data?.inviteTokenInfo) {
    return { title: 'Invite' };
  }

  const { projectTitle, inviterName } = data.inviteTokenInfo;

  return {
    title: `${inviterName} invited you to collaborate on ${projectTitle}`,
    description: `You've been invited to collaborate on ${projectTitle}.`,
  };
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  // params consumed by the client component via useParams()
  // must be awaited per Next.js 16 dynamic params convention
  await params;
  return <InviteContent />;
}
