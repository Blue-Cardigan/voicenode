import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const description =
  "A collaborative whiteboard you converse with. Sticky notes, arrows, and groups created live by an AI agent.";

export const metadata: Metadata = {
  title: {
    default: "voicenode — brainstorm by voice",
    template: "%s · voicenode",
  },
  description,
  applicationName: "voicenode",
  openGraph: {
    type: "website",
    siteName: "voicenode",
    title: "voicenode — brainstorm by voice",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "voicenode — brainstorm by voice",
    description,
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
