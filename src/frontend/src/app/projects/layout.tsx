import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects | Find Your Tribe',
  description:
    "Browse shipped and in-progress projects from the builder community.",
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
