import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { themeInitializationScript } from "./theme";
import { TopBar } from "./top-bar";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "AppSec Workbench",
    template: "%s | AppSec Workbench",
  },
  description: "Local AppSec control plane",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={inter.variable} lang="en">
      <body>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {themeInitializationScript}
        </Script>
        <div className="shell">
          <TopBar />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
