import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: {
      default: "Grounded — Realistic AI career guidance",
      template: "%s · Grounded",
    },
    description:
      "Evidence-first job matching, salary guidance, truthful resume tailoring, and controlled application preparation.",
    keywords: [
      "AI job application tool",
      "AI resume optimizer",
      "job matching AI",
      "salary checker by job title",
      "visa sponsorship jobs",
      "Singapore jobs with EP sponsorship",
    ],
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      title: "Grounded — Realistic AI career guidance",
      description: "Evidence-first job search with traceable recommendations and human control.",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Grounded — Evidence-first job search" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Grounded — Realistic AI career guidance",
      description: "Evidence-first job search with traceable recommendations and human control.",
      images: ["/og.png"],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#17201d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
