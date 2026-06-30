import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "./lib/getSiteSettings";
import { SiteSettingsProvider } from "./lib/SiteSettingsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.org_name,
    description: `${settings.org_name} — AI Interview Practice Platform`,
    icons: settings.logo_url ? [{ url: settings.logo_url }] : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html
      lang="en"
      style={
        {
          "--color-primary": settings.primary_color,
          "--color-secondary": settings.secondary_color,
        } as React.CSSProperties
      }
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SiteSettingsProvider settings={settings}>
          {children}
        </SiteSettingsProvider>
      </body>
    </html>
  );
}