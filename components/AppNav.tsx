"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Database, KanbanSquare, Mail, Map, Search, Settings, SquareCheckBig, Users, LayoutGrid, type LucideIcon, MapPinned } from "lucide-react";

type WorkspaceNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type WorkspaceNavGroup = {
  label: string;
  items: WorkspaceNavItem[];
};

export const navGroups: WorkspaceNavGroup[] = [
  {
    label: "Discover",
    items: [
      { label: "Scout", href: "/", icon: Search },
      { label: "Territories", href: "/territories", icon: Map },
      { label: "Map", href: "/map", icon: MapPinned },
      { label: "Intelligence", href: "/intelligence", icon: Activity },
    ],
  },
  {
    label: "Relationships",
    items: [
      { label: "Market Sources", href: "/pipeline", icon: KanbanSquare },
      { label: "Talent CRM", href: "/talent", icon: Users },
      { label: "Outreach", href: "/outreach", icon: Mail },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Tasks", href: "/tasks", icon: SquareCheckBig },
      { label: "Sources", href: "/connectors", icon: Database },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "More tools", href: "/more", icon: LayoutGrid },
    ],
  },
];

export const navItems = navGroups.flatMap((group) => group.items);

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="appNav" aria-label="Clear Steps workspace">
      {navGroups.map((group) => (
        <section className="navGroup" key={group.label} aria-label={group.label}>
          <span className="navGroupLabel">{group.label}</span>
          <div className="navGroupItems">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "navItem active" : "navItem"}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={16} aria-hidden="true" focusable="false" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
