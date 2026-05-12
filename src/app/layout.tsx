import type { Metadata } from "next";
import { JetBrains_Mono, Syne } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pulse · Outlook work desk",
  description: "Mail follow-ups, tasks, and smart reminders (demo or Microsoft 365)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${mono.variable}`}>
      <body className="font-sans scanline">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
