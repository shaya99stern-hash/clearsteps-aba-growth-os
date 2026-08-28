import Link from "next/link";
import type { ReactNode } from "react";
import { AppNav } from "./AppNav";

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
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-black focus:outline-none focus:ring-4 focus:ring-orange-300"
      >
        Skip to main content
      </a>
      <header className="appHeader">
        <div className="headerInner">
          <div className="brandRow">
            <Link href="/" className="brandLockup">
              <span className="brandMark">CS</span>
              <span><i>Clear Steps</i><b>Growth OS</b></span>
            </Link>
            <span className="livePill"><i /> API-free core</span>
          </div>
          {!compact && (
            <div className="pageIntro">
              <span className="eyebrow">Evidence-first ABA growth intelligence</span>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          )}
          <AppNav />
        </div>
      </header>
      <main id="page-content" tabIndex={-1} className={compact ? "pageContent compact" : "pageContent"}>{children}</main>
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
