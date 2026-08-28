"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Database, KanbanSquare, Mail, Map, Search, Settings, SquareCheckBig, Users } from "lucide-react";

const navItems = [
  { label: "Scout", href: "/", icon: Search },
  { label: "Territories", href: "/territories", icon: Map },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { label: "Talent", href: "/talent", icon: Users },
  { label: "Outreach", href: "/outreach", icon: Mail },
  { label: "Tasks", href: "/tasks", icon: SquareCheckBig },
  { label: "Intelligence", href: "/intelligence", icon: Activity },
  { label: "Sources", href: "/connectors", icon: Database },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="appNav" aria-label="Clear Steps navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className={active ? "navItem active" : "navItem"}>
            <Icon size={15} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
export { navItems };
