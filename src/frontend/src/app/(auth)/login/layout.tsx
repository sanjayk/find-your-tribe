import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Log in to Find Your Tribe.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
