import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { TopBar } from "./top-bar";

export const metadata: Metadata = {
  title: "AppSec Workbench",
  description: "Local AppSec control plane",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <div className="shell">
            <TopBar />
            <main className="main">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
