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
    <main className="appFrame">
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
      <div className={compact ? "pageContent compact" : "pageContent"}>{children}</div>
    </main>
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
