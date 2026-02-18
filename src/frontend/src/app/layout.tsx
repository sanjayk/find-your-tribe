import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/layout/nav";
import Footer from "@/components/layout/footer";
import { GraphQLProvider } from "@/lib/graphql/provider";
import { AuthGuard } from "@/components/layout/auth-guard";

const dmSerifDisplay = DM_Serif_Display({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: {
    default: 'Find Your Tribe',
    template: '%s | Find Your Tribe',
  },
  description:
    'A proof-of-work social network for builders. Your reputation is earned through shipped projects and verified collaborations.',
  openGraph: {
    type: 'website',
    siteName: 'Find Your Tribe',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.webmanifest',
  other: {
    'theme-color': '#f9f8f6',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={{
        "--font-serif": dmSerifDisplay.style.fontFamily,
        "--font-sans": dmSans.style.fontFamily,
        "--font-mono": ibmPlexMono.style.fontFamily,
      } as React.CSSProperties}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Find Your Tribe',
              url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
              description:
                'A proof-of-work social network for builders.',
            }),
          }}
        />
        <GraphQLProvider>
          <Nav />
          <AuthGuard>{children}</AuthGuard>
          <Footer />
        </GraphQLProvider>
      </body>
    </html>
  );
}
