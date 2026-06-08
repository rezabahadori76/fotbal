import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academy Hub — Soccer Academy Dashboard",
  description: "Coach your squad with 4-option check-ins and player statistics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
