import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/repositories", label: "Repositories" },
  { href: "/findings", label: "Findings" },
  { href: "/controls", label: "Controls" },
  { href: "/modules/runs", label: "Module Runs" },
];

export function TopBar() {
  return (
    <header className="topbar">
      <Link className="brand" href="/dashboard">
        AppSec Workbench
      </Link>
      <nav className="nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
