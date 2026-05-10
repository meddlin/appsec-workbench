import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub Inventory",
  description: "Local AppSec control plane",
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/repositories", label: "Repositories" },
  { href: "/dependabot-alerts", label: "Dependabot Alerts" },
  { href: "/findings", label: "Findings" },
  { href: "/controls", label: "Controls" },
  { href: "/modules/runs", label: "Module Runs" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/dashboard">
              GitHub Inventory
            </Link>
            <nav className="nav" aria-label="Primary navigation">
              {navItems.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
