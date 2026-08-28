"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KanbanSquare, Map, MoreHorizontal, Search, SquareCheckBig, type LucideIcon } from "lucide-react";

type MobileTab = {
  label: string;
  href: string;
  icon: LucideIcon;
  active: (pathname: string) => boolean;
};

const tabs: MobileTab[] = [
  { label: "Scout", href: "/", icon: Search, active: (pathname) => pathname === "/" },
  { label: "Territories", href: "/territories", icon: Map, active: (pathname) => pathname.startsWith("/territories") },
  { label: "CRM", href: "/pipeline", icon: KanbanSquare, active: (pathname) => pathname.startsWith("/pipeline") || pathname.startsWith("/talent") },
  { label: "Tasks", href: "/tasks", icon: SquareCheckBig, active: (pathname) => pathname.startsWith("/tasks") },
  {
    label: "More",
    href: "/more",
    icon: MoreHorizontal,
    active: (pathname) => ["/more", "/intelligence", "/outreach", "/connectors", "/settings"].some((prefix) => pathname.startsWith(prefix)),
  },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="mobileTabBar" aria-label="ABA Engine primary navigation">
      <div className="mobileTabBarInner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.active(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={active ? "mobileTab active" : "mobileTab"}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} aria-hidden="true" focusable="false" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
