"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Lead Discovery", href: "/lead-discovery" },
  { label: "Research Runs", href: "/research-runs" },
  { label: "Referral Sources", href: "/referral-sources" },
  { label: "Organizations", href: "/organizations" },
  { label: "Contacts", href: "/contacts" },
  { label: "Demand Signals", href: "/demand-signals" },
  { label: "Competitor Signals", href: "/competitor-signals" },
  { label: "Intelligence", href: "/intelligence" },
  { label: "Outreach", href: "/outreach" },
  { label: "Follow-Ups", href: "/follow-ups" },
  { label: "CSV Imports", href: "/csv-imports" },
  { label: "Connectors", href: "/connectors" },
  { label: "Settings", href: "/settings" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Clear Steps Growth OS navigation">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition ${
              active
                ? "border-cyan-600 bg-cyan-50 text-cyan-800 shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { navItems };
