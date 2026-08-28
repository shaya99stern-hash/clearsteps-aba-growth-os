import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Plus, Search } from "lucide-react";
import { AppNav } from "./AppNav";
import { MobileTabBar } from "./MobileTabBar";

export function PageShell({
  title,
  description,
  children,
  compact = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="appFrame">
      <a
        href="#page-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-black focus:outline-none focus:ring-4 focus:ring-violet-300"
      >
        Skip to main content
      </a>

      <aside className="workspaceRail">
        <div className="railHeader">
          <Link href="/" className="brandLockup" aria-label="Clear Steps home">
            <Image className="brandImage" src="/api/app-icon" alt="" width={40} height={40} priority unoptimized />
            <span className="brandWords"><i>Clear Steps</i><b>ABA Engine</b></span>
          </Link>
        </div>
        <AppNav />
        <div className="railFooter">
          <span className="livePill"><i /> MO + KS intelligence</span>
          <p>Client · RBT · BCBA evidence engine + durable workspace</p>
        </div>
      </aside>

      <section className="workspaceSurface">
        <header className="workspaceTopbar">
          <div className="topbarContext">
            <span>ABA Engine</span>
            <strong>{title}</strong>
          </div>
          <div className="topbarActions">
            <Link href="/" className="topbarSearch">
              <Search size={14} aria-hidden="true" />
              <span>Scout</span>
              <kbd>Research</kbd>
            </Link>
            <Link href="/tasks" className="topbarPrimary">
              <Plus size={14} aria-hidden="true" />
              <span>New task</span>
            </Link>
          </div>
        </header>

        {!compact && (
          <div className="pageIntroWrap">
            <div className="pageIntro">
              <span className="eyebrow">Missouri + Kansas ABA intelligence</span>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          </div>
        )}

        <main id="page-content" tabIndex={-1} className={compact ? "pageContent compact" : "pageContent"}>{children}</main>
      </section>

      <MobileTabBar />
    </div>
  );
}

export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <section className="emptyDark"><h2>{title}</h2><p>{description}</p>{children ? <div className="emptyActions">{children}</div> : null}</section>;
}

export function MetricCard({ title, value }: { title: string; value: string | number }) {
  return <div className="metricCard"><p>{title}</p><strong>{value}</strong></div>;
}

export function InfoCard({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <article className="infoCard"><h2>{title}</h2>{description ? <p>{description}</p> : null}{children ? <div className="infoCardBody">{children}</div> : null}</article>;
}
