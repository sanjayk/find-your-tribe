import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { GraphQLProvider } from "@/lib/graphql/provider";

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
  title: "Find Your Tribe",
  description: "A social network where clout comes from shipping. Connect your GitHub, form a tribe, and let your work speak.",
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
      <body className="font-sans">
        <GraphQLProvider>
          <Nav />
          {children}
          <Footer />
        </GraphQLProvider>
      </body>
    </html>
  );
}
