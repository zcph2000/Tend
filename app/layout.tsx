import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tend — Regenerativ gårdsstyring",
  description: "Spor dyr, rotationer og markobservationer efter regenerative principper",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tend",
  },
};

export const viewport: Viewport = {
  themeColor: "#4c8027",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
