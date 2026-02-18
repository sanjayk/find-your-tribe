import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Build Feed',
  description:
    'See what builders are shipping. Projects, tribes, and collaborations.',
};

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
