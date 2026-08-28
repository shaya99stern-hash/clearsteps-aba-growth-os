import Link from "next/link";
import { Activity, ChevronRight, Database, Mail, Settings, Users } from "lucide-react";
import { PageShell } from "@/components/PageShell";

const items = [
  { label: "Talent CRM", description: "RBT and BCBA recruiting pipeline", href: "/talent", icon: Users },
  { label: "Intelligence", description: "Market and evidence views", href: "/intelligence", icon: Activity },
  { label: "Outreach", description: "Reviewed referral outreach workspace", href: "/outreach", icon: Mail },
  { label: "Sources", description: "Public-source health and coverage", href: "/connectors", icon: Database },
  { label: "Settings", description: "Workspace and operating preferences", href: "/settings", icon: Settings },
] as const;

export default function MorePage() {
  return (
    <PageShell
      title="More"
      description="Secondary Clear Steps workspaces and operating tools."
    >
      <section className="mobileMoreGrid" aria-label="More workspaces">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="mobileMoreRow">
              <span className="mobileMoreIcon"><Icon size={18} aria-hidden="true" /></span>
              <span className="mobileMoreCopy"><b>{item.label}</b><small>{item.description}</small></span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          );
        })}
      </section>
    </PageShell>
  );
}
