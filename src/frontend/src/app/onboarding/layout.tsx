import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Your Profile',
  description:
    'Set up your builder profile — name, role, skills, and timezone.',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
