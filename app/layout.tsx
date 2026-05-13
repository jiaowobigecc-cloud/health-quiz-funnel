import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitPulse Health Quiz",
  description: "A full-stack health assessment funnel with persistence, scoring, and subscription gating."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
