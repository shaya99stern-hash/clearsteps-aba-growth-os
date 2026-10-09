"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Avoid logging user-entered search terms or personal input.
    console.error("Clear Steps route failed", error.digest ?? error.name);
  }, [error]);
  return (
    <main className="routeError" role="alert">
      <div className="routeErrorCard">
        <p className="eyebrow">CLEAR STEPS</p>
        <h1>That screen couldn&apos;t load</h1>
        <p>Your saved work has not been intentionally changed. You can retry the screen or return to Scout.</p>
        <div className="routeErrorActions">
          <button type="button" onClick={() => reset()}>Try again</button>
          <Link href="/">Back to Scout</Link>
        </div>
      </div>
    </main>
  );
}
