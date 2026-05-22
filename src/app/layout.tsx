import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Font variables are attached to <html> so Tailwind/global CSS can reference
// them throughout the app without prop-drilling classes through feature code.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Default metadata used by the root Visual Vibes route. */
export const metadata: Metadata = {
  title: "Visual Vibes",
  description: "Visual editor for reading, editing, validating, and debugging Vibe workflow templates.",
};

/** Shared document shell for all app routes. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
