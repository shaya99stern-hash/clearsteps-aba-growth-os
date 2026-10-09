import Link from "next/link";
import { Activity, ChevronRight, Database, Mail, MapPinned, Settings, Users, Search, History, Network, Building2, ClipboardList, FileUp, PhoneForwarded, ChartNoAxesColumn, MessagesSquare } from "lucide-react";
import { PageShell } from "@/components/PageShell";

const items = [
  { label: "Map", description: "County maps, 2/5/10-mile radius research", href: "/map", icon: MapPinned },
  { label: "Talent CRM", description: "RBT and BCBA recruitment", href: "/talent", icon: Users },
  { label: "Intelligence", description: "Verified evidence and decisions", href: "/intelligence", icon: Activity },
  { label: "Outreach", description: "Reviewed organizational outreach", href: "/outreach", icon: Mail },
  { label: "Sources", description: "Public source availability", href: "/connectors", icon: Database },
  { label: "Research runs", description: "Previous discovery results", href: "/research-runs", icon: History },
  { label: "Lead Discovery", description: "Legacy public-organization discovery tool", href: "/lead-discovery", icon: Search },
  { label: "Referral Sources", description: "Referral directory workspace", href: "/referral-sources", icon: Network },
  { label: "Organizations", description: "Organization records workspace", href: "/organizations", icon: Building2 },
  { label: "Contacts", description: "Organizational business contacts", href: "/contacts", icon: PhoneForwarded },
  { label: "Demand signals", description: "Public demand research workspace", href: "/demand-signals", icon: ChartNoAxesColumn },
  { label: "Competitor signals", description: "Public competitor research", href: "/competitor-signals", icon: MessagesSquare },
  { label: "Follow-ups", description: "Organizational follow-up workspace", href: "/follow-ups", icon: ClipboardList },
  { label: "CSV imports", description: "Blank source-data templates", href: "/csv-imports", icon: FileUp },
  { label: "Settings", description: "Workspace configuration", href: "/settings", icon: Settings },
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
