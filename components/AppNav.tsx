"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Building2, ChartNoAxesCombined, Database, Home, KanbanSquare, Mail, Map, Search, Send, Settings, SquareCheckBig, Users, LayoutGrid, type LucideIcon, MapPinned } from "lucide-react";

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
  { label: "Workspace", items: [
    { label: "Home", href: "/", icon: Home },
    { label: "Leads", href: "/leads", icon: ChartNoAxesCombined },
    { label: "CRM", href: "/crm", icon: Users },
  ] },
  { label: "CRM", items: [
    { label: "Organizations", href: "/organizations", icon: Building2 },
    { label: "Contacts", href: "/contacts", icon: Users },
    { label: "Market Sources", href: "/pipeline", icon: KanbanSquare },
    { label: "Talent CRM", href: "/talent", icon: Users },
    { label: "Tasks", href: "/tasks", icon: SquareCheckBig },
    { label: "Activity & insights", href: "/intelligence", icon: Activity },
  ] },
  { label: "Communication", items: [{ label: "Outreach", href: "/outreach", icon: Mail }, { label: "Follow-ups", href: "/follow-ups", icon: Send }] },
  {
    label: "Research",
    items: [
      { label: "Scout", href: "/scout", icon: Search },
      { label: "Territories", href: "/territories", icon: Map },
      { label: "Map", href: "/map", icon: MapPinned },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Sources", href: "/connectors", icon: Database },
      { label: "More tools", href: "/more", icon: LayoutGrid },
    ],
  },
  { label: "Preferences", items: [{ label: "Settings", href: "/settings", icon: Settings }] },
];

export const navItems = navGroups.flatMap((group) => group.items);

const crmPaths = ["/crm", "/organizations", "/contacts", "/pipeline", "/talent", "/tasks", "/intelligence", "/outreach", "/follow-ups", "/referral-sources"];
export function visibleNavGroups(pathname: string) {
  const crm = crmPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
  const research = ["/scout", "/territories", "/map", "/research-runs", "/lead-discovery"].includes(pathname);
  return navGroups.filter((group) => group.label !== "Preferences" &&
    (group.label !== "CRM" && group.label !== "Communication" || crm) &&
    (group.label !== "Research" || research));
}
export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "/today";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="appNav" aria-label="Clear Steps workspace">
      {visibleNavGroups(pathname).map((group) => (
        <section className="navGroup" key={group.label} aria-label={group.label}>
          {group.label !== "Workspace" && <span className="navGroupLabel">{group.label}</span>}
          <div className="navGroupItems">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(pathname, item.href);
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
