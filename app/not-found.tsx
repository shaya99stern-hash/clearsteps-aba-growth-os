import Link from "next/link";

export default function WorkspaceNotFound() {
  return (
    <main className="routeError">
      <div className="routeErrorCard">
        <p className="eyebrow">404 · CLEAR STEPS</p>
        <h1>Screen not found</h1>
        <p>This workspace address is no longer available. Your saved research and tasks have not been deleted.</p>
        <div className="routeErrorActions">
          <Link href="/">Return to Scout</Link>
          <Link href="/more">Browse workspaces</Link>
        </div>
      </div>
    </main>
  );
}
