import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover Builders',
  description:
    'Find builders by skill, role, timezone, and availability.',
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
