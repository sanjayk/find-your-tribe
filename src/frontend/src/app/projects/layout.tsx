import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects | Find Your Tribe',
  description:
    'Explore projects from your tribe and discover what they are shipping.',
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
