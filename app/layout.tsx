import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaskAgent — Control Plane",
  description:
    "Reliability-first AI agent runtime dashboard. Hierarchical planning, Airlock, verification, observability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}
      >
        <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold">
                TA
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight">
                  TaskAgent
                </div>
                <div className="text-xs text-zinc-500">
                  Control Plane · FallnAI
                </div>
              </div>
            </div>
            <nav className="flex items-center gap-4 text-sm text-zinc-400">
              <a href="/" className="hover:text-zinc-100">
                Tasks
              </a>
            </nav>
          </div>
        </div>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
