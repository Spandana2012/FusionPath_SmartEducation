import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "FusionPath",
  description: "Your goal. Your gaps. Your path.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
