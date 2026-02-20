import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tribes',
  description: 'Find builders to team up with.',
};

export default function TribesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
